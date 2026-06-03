/**
 * NegotiateSurface — two-browser, share-by-URL negotiation.
 *
 * Each party picks a role, makes an offer, hits "Send to other party"
 * to copy a fresh URL that encodes the entire session state. The
 * partner opens that URL, sees the latest offer, makes a counter, and
 * sends back. The deal closes when both sides hit Accept.
 *
 * Storage: session state lives only in the URL (?n=<base64>). No
 * backend, no server. A BroadcastChannel best-effort sync lets two
 * tabs on the same machine update in real time.
 */

import { useEffect, useMemo, useRef, useState } from "react";
import type { CSSProperties } from "react";
import {
  FUNCTIONAL_NEGOTIATION_MECHANISMS,
  LEGACY_NEGOTIATION_URL_PARAM,
  NEGOTIATION_URL_PARAM,
  appendSurfaceRound,
  applySurfaceAccept,
  decodeNegotiationFromURLSearch,
  decodeSurfaceState,
  encodeSurfaceState,
  latestSurfaceOfferFor,
  newSurfaceState,
  runSurfaceEngine,
  withMechanism,
  type NegotiationMechanismId,
  type NegotiationRole,
  type NegotiationSurfaceStateV2,
} from "@lab/engine";
import { AgentFigure } from "../../primitives/AgentFigure";

const BROADCAST_CHANNEL = "proc-lab.negotiate.v2";
const SESSION_STORAGE_KEY = "proc-lab.negotiate.role";

interface NegotiateSurfaceProps {
  onOpenHome: () => void;
}

function readSessionFromURL(): {
  state: NegotiationSurfaceStateV2;
  translatedFromLegacy: boolean;
  error: string | null;
} | null {
  if (typeof window === "undefined") return null;
  const decoded = decodeNegotiationFromURLSearch(window.location.search);
  if (!decoded) return null;
  if (!decoded.ok) {
    return {
      state: newSurfaceState(),
      translatedFromLegacy: false,
      error: decoded.reason,
    };
  }
  return {
    state: decoded.state,
    translatedFromLegacy: decoded.translatedFromLegacy,
    error: null,
  };
}

function writeSessionToURL(state: NegotiationSurfaceStateV2): void {
  if (typeof window === "undefined") return;
  const encoded = encodeSurfaceState(state);
  const url = new URL(window.location.href);
  url.searchParams.set(NEGOTIATION_URL_PARAM, encoded);
  url.searchParams.delete(LEGACY_NEGOTIATION_URL_PARAM);
  window.history.replaceState(null, "", url.toString());
}

function readRolePreference(): NegotiationRole | null {
  if (typeof sessionStorage === "undefined") return null;
  const value = sessionStorage.getItem(SESSION_STORAGE_KEY);
  if (value === "buyer" || value === "supplier") return value;
  return null;
}

function persistRole(role: NegotiationRole): void {
  if (typeof sessionStorage === "undefined") return;
  sessionStorage.setItem(SESSION_STORAGE_KEY, role);
}

export function NegotiateSurface({ onOpenHome }: NegotiateSurfaceProps) {
  const [state, setState] = useState<NegotiationSurfaceStateV2>(() => {
    return readSessionFromURL()?.state ?? newSurfaceState();
  });
  const [decodeError, setDecodeError] = useState<string | null>(() => {
    return readSessionFromURL()?.error ?? null;
  });
  const [translatedLegacy, setTranslatedLegacy] = useState(false);
  const [role, setRoleState] = useState<NegotiationRole | null>(() =>
    readRolePreference(),
  );
  const [draftQ, setDraftQ] = useState<number>(400);
  const [draftPrice, setDraftPrice] = useState<number>(85);
  const [draftNote, setDraftNote] = useState<string>("");
  const [shareCopied, setShareCopied] = useState(false);
  // Track which round indices the user has already seen so we can
  // flash a "new offer arrived" banner when the partner posts.
  const lastSeenRoundsRef = useRef<number>(state.history.length);
  const [newOfferFlash, setNewOfferFlash] = useState<{
    roundIndex: number;
    fromRole: NegotiationRole;
  } | null>(null);
  // Pending accept-confirmation. Holds the offer the user is about to
  // accept until they confirm.
  const [pendingAcceptIdx, setPendingAcceptIdx] = useState<number | null>(null);
  const channelRef = useRef<BroadcastChannel | null>(null);

  // Sync from URL once on mount.
  useEffect(() => {
    const urlState = readSessionFromURL();
    if (urlState) {
      setState(urlState.state);
      setDecodeError(urlState.error);
      setTranslatedLegacy(urlState.translatedFromLegacy);
      if (urlState.translatedFromLegacy) {
        writeSessionToURL(urlState.state);
      }
    }
  }, []);

  // Set up a BroadcastChannel so two tabs on the same machine keep
  // up in real time.
  useEffect(() => {
    if (typeof BroadcastChannel === "undefined") return;
    const channel = new BroadcastChannel(BROADCAST_CHANNEL);
    channelRef.current = channel;
    channel.onmessage = (event) => {
      const decoded = typeof event.data === "string" ? decodeSurfaceState(event.data) : null;
      if (!decoded?.ok) return;
      const next = decoded.state;
      // Last writer wins by length, then by latest timestamp.
      setState((prev) => {
        if (next.history.length > prev.history.length) return next;
        if (next.history.length < prev.history.length) return prev;
        if (next.buyerAccepted !== prev.buyerAccepted) return next;
        if (next.supplierAccepted !== prev.supplierAccepted) return next;
        return prev;
      });
    };
    return () => {
      channel.close();
      channelRef.current = null;
    };
  }, []);

  // Whenever state changes, write it to the URL + broadcast.
  useEffect(() => {
    writeSessionToURL(state);
    const encoded = encodeSurfaceState(state);
    channelRef.current?.postMessage(encoded);
  }, [state]);

  // Detect new partner offers and flash a banner. A "new" offer is
  // one whose round index is greater than the last seen index AND was
  // posted by the role opposite to ours. If the user hasn't picked a
  // role yet, every appended round counts as new.
  useEffect(() => {
    const newCount = state.history.length - lastSeenRoundsRef.current;
    if (newCount <= 0) {
      lastSeenRoundsRef.current = state.history.length;
      return;
    }
    // walk forward through the new rounds; flash the most recent
    // round that came from the partner.
    let flashIdx: number | null = null;
    let flashRole: NegotiationRole | null = null;
    for (
      let i = lastSeenRoundsRef.current;
      i < state.history.length;
      i += 1
    ) {
      const r = state.history[i];
      if (!role || r.role !== role) {
        flashIdx = i;
        flashRole = r.role;
      }
    }
    lastSeenRoundsRef.current = state.history.length;
    if (flashIdx !== null && flashRole !== null) {
      setNewOfferFlash({ roundIndex: flashIdx, fromRole: flashRole });
      const timer = window.setTimeout(() => setNewOfferFlash(null), 4000);
      return () => window.clearTimeout(timer);
    }
  }, [state.history.length, role]);

  // Detect a "role conflict": this browser claims a role, but the
  // session URL already carries offers from that same role posted by
  // someone else (i.e. the partner also chose this role). Surface a
  // warning so the demo doesn't silently produce a half-dead session.
  const roleConflict =
    role !== null &&
    state.history.length > 0 &&
    state.history.every((r) => r.role === role);

  const otherRole: NegotiationRole | null =
    role === "buyer" ? "supplier" : role === "supplier" ? "buyer" : null;
  const myLastOffer = role ? latestSurfaceOfferFor(state, role) : null;
  const partnerLastOffer = otherRole ? latestSurfaceOfferFor(state, otherRole) : null;
  const dealClosed = state.buyerAccepted && state.supplierAccepted;

  const handlePickRole = (next: NegotiationRole) => {
    setRoleState(next);
    persistRole(next);
  };

  const handleSubmit = () => {
    if (!role) return;
    const round = {
      role,
      offer: {
        q: Math.max(0, Math.floor(draftQ)),
        unitPrice: Math.max(0, Math.floor(draftPrice)),
        note: draftNote.slice(0, 240),
      },
      at: new Date().toISOString(),
    };
    setState((prev) => runSurfaceEngine(appendSurfaceRound(prev, round)));
    setDraftNote("");
  };

  const handleMechanismChange = (mechanismId: NegotiationMechanismId) => {
    setState((prev) => runSurfaceEngine(withMechanism(prev, mechanismId)));
  };

  // Suggest the OTHER role on the picker if the URL already carries
  // offers from one side. Returns null if no signal either way.
  const suggestedRole: NegotiationRole | null = (() => {
    if (state.history.length === 0) return null;
    const buyerCount = state.history.filter((r) => r.role === "buyer").length;
    const supplierCount = state.history.length - buyerCount;
    if (buyerCount > 0 && supplierCount === 0) return "supplier";
    if (supplierCount > 0 && buyerCount === 0) return "buyer";
    return null;
  })();

  // Two-step accept: clicking "Accept partner's latest" opens a
  // confirmation card; clicking "Confirm" commits the accept.
  const handleAcceptRequest = () => {
    if (!role) return;
    const partnerIdx = (() => {
      for (let i = state.history.length - 1; i >= 0; i -= 1) {
        if (state.history[i].role !== role) return i;
      }
      return null;
    })();
    if (partnerIdx === null) return;
    setPendingAcceptIdx(partnerIdx);
  };

  const handleAcceptConfirm = () => {
    if (!role) return;
    setState((prev) => applySurfaceAccept(prev, role));
    setPendingAcceptIdx(null);
  };

  const handleAcceptCancel = () => setPendingAcceptIdx(null);

  const handleNewSession = () => {
    const fresh = newSurfaceState();
    setState(fresh);
    setDecodeError(null);
    setTranslatedLegacy(false);
    setRoleState(null);
    if (typeof sessionStorage !== "undefined") {
      sessionStorage.removeItem(SESSION_STORAGE_KEY);
    }
    if (typeof window !== "undefined") {
      const url = new URL(window.location.href);
      url.searchParams.delete(NEGOTIATION_URL_PARAM);
      url.searchParams.delete(LEGACY_NEGOTIATION_URL_PARAM);
      window.history.replaceState(null, "", url.toString());
    }
  };

  const handleCopyLink = async () => {
    if (typeof window === "undefined") return;
    const url = window.location.href;
    try {
      if (navigator.clipboard?.writeText) {
        await navigator.clipboard.writeText(url);
        setShareCopied(true);
        window.setTimeout(() => setShareCopied(false), 2000);
      } else {
        window.prompt("Send this URL to the other party", url);
      }
    } catch {
      window.prompt("Send this URL to the other party", url);
    }
  };

  const shell: CSSProperties = {
    minHeight: "100vh",
    background: "var(--neutral-bg, #f7f7f4)",
    padding: "var(--space-5, 24px)",
    color: "var(--neutral-fg, #1c1c1f)",
  };
  const main: CSSProperties = {
    maxWidth: "960px",
    margin: "0 auto",
    display: "flex",
    flexDirection: "column",
    gap: "var(--space-5, 24px)",
  };
  const navRow: CSSProperties = {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    gap: "var(--space-3, 12px)",
    flexWrap: "wrap",
  };
  const card: CSSProperties = {
    background: "var(--neutral-bg-2, #ffffff)",
    borderRadius: "var(--radius-card, 16px)",
    padding: "var(--space-5, 24px)",
    border: "1px solid var(--neutral-line, #e3e3df)",
    display: "flex",
    flexDirection: "column",
    gap: "var(--space-4, 16px)",
  };
  const button: CSSProperties = {
    background: "var(--role-buyer, #3a78ff)",
    color: "white",
    border: 0,
    padding: "var(--space-3, 12px) var(--space-5, 24px)",
    borderRadius: "var(--radius-pill, 999px)",
    fontWeight: 600,
    fontSize: "var(--type-2, 1rem)",
    cursor: "pointer",
  };
  const ghostBtn: CSSProperties = {
    ...button,
    background: "transparent",
    color: "var(--neutral-fg, #1c1c1f)",
    border: "1px solid var(--neutral-line, #e3e3df)",
  };
  const acceptBtn: CSSProperties = {
    ...button,
    background: "var(--surplus-good, #1bb676)",
  };

  return (
    <div style={shell} data-testid="negotiate-surface">
      <div style={main}>
        <div style={navRow}>
          <button
            type="button"
            style={ghostBtn}
            onClick={onOpenHome}
            data-testid="negotiate-home"
          >
            ← Home
          </button>
          <button
            type="button"
            style={ghostBtn}
            onClick={handleNewSession}
            data-testid="negotiate-new-session"
          >
            Start new session
          </button>
        </div>

        <h1 style={{ margin: 0, fontSize: "var(--type-5, 1.8rem)" }}>
          Negotiate with a partner
        </h1>
        <p style={{ margin: 0, color: "var(--neutral-fg-soft, #5b5b62)" }}>
          Pick your role, make an offer, send the link to your partner.
          They open it, see your offer, counter, and send back. Two tabs
          on the same machine stay in sync automatically.
        </p>

        {decodeError && (
          <div
            data-testid="legacy-url-error"
            role="alert"
            style={{
              background: "var(--walkaway-zone, rgba(210, 74, 74, 0.1))",
              borderLeft: "4px solid var(--surplus-lost, #d24a4a)",
              borderRadius: "var(--radius-tile, 12px)",
              padding: "var(--space-3, 12px) var(--space-4, 16px)",
            }}
          >
            This negotiation link could not be opened: {decodeError}. Start a
            new session or ask your partner to send a fresh link.
          </div>
        )}

        {translatedLegacy && (
          <div
            data-testid="legacy-url-translated"
            role="status"
            style={{
              background: "var(--deal-zone, rgba(27, 182, 118, 0.1))",
              borderLeft: "4px solid var(--surplus-good, #1bb676)",
              borderRadius: "var(--radius-tile, 12px)",
              padding: "var(--space-3, 12px) var(--space-4, 16px)",
            }}
          >
            Legacy link translated to the v2 engine contract.
          </div>
        )}

        <div style={card} data-testid="mechanism-selector">
          <h2 style={{ margin: 0, fontSize: "var(--type-3, 1.05rem)" }}>
            Mechanism
          </h2>
          <div style={{ display: "flex", gap: "var(--space-3, 12px)", flexWrap: "wrap" }}>
            {FUNCTIONAL_NEGOTIATION_MECHANISMS.map((mechanism) => {
              const selected = state.mechanismId === mechanism.id;
              return (
                <button
                  key={mechanism.id}
                  type="button"
                  style={{
                    ...(selected ? button : ghostBtn),
                    background: selected ? "var(--role-buyer, #3a78ff)" : ghostBtn.background,
                  }}
                  onClick={() => handleMechanismChange(mechanism.id)}
                  data-testid={`mechanism-${mechanism.id}`}
                  aria-pressed={selected}
                >
                  {mechanism.label}
                </button>
              );
            })}
          </div>
          <div
            data-testid="mechanism-description"
            style={{ color: "var(--neutral-fg-soft, #5b5b62)" }}
          >
            {
              FUNCTIONAL_NEGOTIATION_MECHANISMS.find((m) => m.id === state.mechanismId)
                ?.description
            }
          </div>
        </div>

        {role === null ? (
          <div style={card} data-testid="negotiate-role-picker">
            <h2 style={{ margin: 0, fontSize: "var(--type-3, 1.05rem)" }}>
              Pick your role
            </h2>
            {suggestedRole && (
              <p
                data-testid="role-suggestion"
                style={{
                  margin: 0,
                  fontSize: "var(--type-2, 1rem)",
                  color: "var(--neutral-fg-soft, #5b5b62)",
                }}
              >
                The partner has already posted as{" "}
                <strong>
                  {suggestedRole === "buyer" ? "supplier" : "buyer"}
                </strong>
                . Pick <strong>{suggestedRole}</strong> to take the other side
                of the deal.
              </p>
            )}
            <div style={{ display: "flex", gap: "var(--space-3, 12px)", flexWrap: "wrap" }}>
              <button
                type="button"
                style={{
                  ...button,
                  outline:
                    suggestedRole === "buyer"
                      ? "3px solid var(--surplus-good, #1bb676)"
                      : undefined,
                }}
                onClick={() => handlePickRole("buyer")}
                data-testid="role-buyer"
              >
                I'm the buyer{suggestedRole === "buyer" ? " ← suggested" : ""}
              </button>
              <button
                type="button"
                style={{
                  ...button,
                  background: "var(--role-supplier, #f4a85f)",
                  outline:
                    suggestedRole === "supplier"
                      ? "3px solid var(--surplus-good, #1bb676)"
                      : undefined,
                }}
                onClick={() => handlePickRole("supplier")}
                data-testid="role-supplier"
              >
                I'm the supplier
                {suggestedRole === "supplier" ? " ← suggested" : ""}
              </button>
            </div>
          </div>
        ) : (
          <>
            {roleConflict && (
              <div
                data-testid="role-conflict-banner"
                style={{
                  background: "var(--walkaway-zone, rgba(210, 74, 74, 0.1))",
                  borderLeft: "4px solid var(--surplus-lost, #d24a4a)",
                  borderRadius: "var(--radius-tile, 12px)",
                  padding: "var(--space-3, 12px) var(--space-4, 16px)",
                  display: "flex",
                  flexWrap: "wrap",
                  gap: "var(--space-3, 12px)",
                  alignItems: "center",
                  justifyContent: "space-between",
                }}
              >
                <span>
                  <strong>Role conflict.</strong> Your partner already posted
                  as <strong>{role}</strong>. A negotiation needs one of each.
                  Switch sides to take the other half of the deal.
                </span>
                <button
                  type="button"
                  style={{
                    ...button,
                    background: "var(--surplus-lost, #d24a4a)",
                  }}
                  onClick={() =>
                    handlePickRole(role === "buyer" ? "supplier" : "buyer")
                  }
                  data-testid="role-switch"
                >
                  Switch to {role === "buyer" ? "supplier" : "buyer"}
                </button>
              </div>
            )}
            {newOfferFlash && (
              <div
                data-testid="new-offer-flash"
                role="status"
                aria-live="polite"
                style={{
                  background: "var(--deal-zone, rgba(27, 182, 118, 0.18))",
                  borderLeft: "4px solid var(--surplus-good, #1bb676)",
                  borderRadius: "var(--radius-tile, 12px)",
                  padding: "var(--space-3, 12px) var(--space-4, 16px)",
                  fontWeight: 600,
                  boxShadow:
                    "0 0 0 4px color-mix(in srgb, var(--surplus-good, #1bb676) 30%, transparent)",
                }}
              >
                New offer from {newOfferFlash.fromRole} (round{" "}
                {newOfferFlash.roundIndex + 1}).
              </div>
            )}
            <div style={card}>
              <div
                style={{
                  display: "flex",
                  gap: "var(--space-5, 24px)",
                  flexWrap: "wrap",
                  justifyContent: "center",
                  alignItems: "center",
                }}
              >
                <AgentFigure
                  role={role}
                  mood={dealClosed ? "happy" : "neutral"}
                  size="medium"
                  label={`You · ${role}`}
                />
                <div style={{ fontSize: "var(--type-4, 1.3rem)" }}>↔</div>
                <AgentFigure
                  role={otherRole ?? "supplier"}
                  mood={dealClosed ? "happy" : "neutral"}
                  size="medium"
                  label={`Partner · ${otherRole}`}
                />
              </div>

              <div data-testid="negotiate-summary">
                <strong>Session {state.sessionId}</strong> · round{" "}
                {state.history.length}.{" "}
                {dealClosed
                  ? "Both parties accepted."
                  : state.buyerAccepted
                    ? "Buyer accepted; supplier still deciding."
                    : state.supplierAccepted
                      ? "Supplier accepted; buyer still deciding."
                      : "Waiting on next offer."}
              </div>

              {state.engineResponse && (
                <div
                  data-testid="engine-response-report"
                  style={{
                    background: "var(--neutral-bg, #f7f7f4)",
                    borderRadius: "var(--radius-tile, 12px)",
                    border: "1px solid var(--neutral-line, #e3e3df)",
                    padding: "var(--space-4, 16px)",
                    display: "grid",
                    gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))",
                    gap: "var(--space-3, 12px)",
                  }}
                >
                  <div>
                    <div style={{ fontSize: "var(--type-1, 0.85rem)", color: "var(--neutral-fg-soft, #5b5b62)" }}>
                      mechanism
                    </div>
                    <strong data-testid="engine-mechanism">
                      {state.engineResponse.mechanism_id}
                    </strong>
                  </div>
                  <div>
                    <div style={{ fontSize: "var(--type-1, 0.85rem)", color: "var(--neutral-fg-soft, #5b5b62)" }}>
                      proposed counter
                    </div>
                    <strong data-testid="engine-proposal">
                      q={state.engineResponse.proposed_offer.q}, $
                      {state.engineResponse.proposed_offer.unitPrice}/unit
                    </strong>
                  </div>
                  <div>
                    <div style={{ fontSize: "var(--type-1, 0.85rem)", color: "var(--neutral-fg-soft, #5b5b62)" }}>
                      leakage
                    </div>
                    <strong data-testid="engine-leakage">
                      {state.engineResponse.leakage_report
                        ? `epsilon ${state.engineResponse.leakage_report.aggregate.max_epsilon_measured.toFixed(2)}`
                        : "full oracle"}
                    </strong>
                  </div>
                  <div>
                    <div style={{ fontSize: "var(--type-1, 0.85rem)", color: "var(--neutral-fg-soft, #5b5b62)" }}>
                      participation
                    </div>
                    <strong data-testid="engine-participation">
                      {state.engineResponse.participation.every((p) => p.no_worse_off)
                        ? "both above BATNA"
                        : "BATNA violation"}
                    </strong>
                  </div>
                </div>
              )}

              <div
                style={{
                  display: "grid",
                  gridTemplateColumns: "1fr 1fr",
                  gap: "var(--space-3, 12px)",
                }}
              >
                <div>
                  <div
                    style={{
                      fontSize: "var(--type-1, 0.85rem)",
                      color: "var(--neutral-fg-soft, #5b5b62)",
                      textTransform: "uppercase",
                      letterSpacing: "0.04em",
                    }}
                  >
                    your last offer
                  </div>
                  <div data-testid="my-last-offer">
                    {myLastOffer
                      ? `q=${myLastOffer.q}, $${myLastOffer.unitPrice}/unit${myLastOffer.note ? ` — "${myLastOffer.note}"` : ""}`
                      : "—"}
                  </div>
                </div>
                <div>
                  <div
                    style={{
                      fontSize: "var(--type-1, 0.85rem)",
                      color: "var(--neutral-fg-soft, #5b5b62)",
                      textTransform: "uppercase",
                      letterSpacing: "0.04em",
                    }}
                  >
                    partner's last offer
                  </div>
                  <div data-testid="partner-last-offer">
                    {partnerLastOffer
                      ? `q=${partnerLastOffer.q}, $${partnerLastOffer.unitPrice}/unit${partnerLastOffer.note ? ` — "${partnerLastOffer.note}"` : ""}`
                      : "—"}
                  </div>
                </div>
              </div>

              {!dealClosed && (
                <div
                  style={{
                    display: "grid",
                    gridTemplateColumns: "repeat(auto-fit, minmax(160px, 1fr))",
                    gap: "var(--space-3, 12px)",
                    alignItems: "end",
                  }}
                >
                  <label style={{ display: "flex", flexDirection: "column" }}>
                    <span style={{ fontSize: "var(--type-1, 0.85rem)" }}>
                      quantity
                    </span>
                    <input
                      type="number"
                      value={draftQ}
                      min={0}
                      max={2000}
                      step={10}
                      onChange={(e) => setDraftQ(Number(e.target.value))}
                      style={{
                        padding: "var(--space-2, 8px)",
                        borderRadius: "var(--radius-tile, 12px)",
                        border: "1px solid var(--neutral-line, #e3e3df)",
                      }}
                      data-testid="draft-q"
                    />
                  </label>
                  <label style={{ display: "flex", flexDirection: "column" }}>
                    <span style={{ fontSize: "var(--type-1, 0.85rem)" }}>
                      unit price ($)
                    </span>
                    <input
                      type="number"
                      value={draftPrice}
                      min={0}
                      max={1000}
                      step={1}
                      onChange={(e) => setDraftPrice(Number(e.target.value))}
                      style={{
                        padding: "var(--space-2, 8px)",
                        borderRadius: "var(--radius-tile, 12px)",
                        border: "1px solid var(--neutral-line, #e3e3df)",
                      }}
                      data-testid="draft-price"
                    />
                  </label>
                  <label
                    style={{
                      display: "flex",
                      flexDirection: "column",
                      gridColumn: "1 / -1",
                    }}
                  >
                    <span style={{ fontSize: "var(--type-1, 0.85rem)" }}>
                      note (optional)
                    </span>
                    <input
                      type="text"
                      value={draftNote}
                      onChange={(e) => setDraftNote(e.target.value)}
                      placeholder="why this offer makes sense"
                      style={{
                        padding: "var(--space-2, 8px)",
                        borderRadius: "var(--radius-tile, 12px)",
                        border: "1px solid var(--neutral-line, #e3e3df)",
                      }}
                      data-testid="draft-note"
                    />
                  </label>
                </div>
              )}
            </div>

            {!dealClosed && pendingAcceptIdx === null && (
              <div
                style={{
                  display: "flex",
                  gap: "var(--space-3, 12px)",
                  flexWrap: "wrap",
                  justifyContent: "center",
                }}
              >
                <button
                  type="button"
                  style={button}
                  onClick={handleSubmit}
                  data-testid="submit-offer"
                  disabled={roleConflict}
                >
                  Submit offer
                </button>
                <button
                  type="button"
                  style={acceptBtn}
                  onClick={handleAcceptRequest}
                  data-testid="accept-offer"
                  disabled={
                    roleConflict ||
                    state.history.length === 0 ||
                    partnerLastOffer === null
                  }
                >
                  Accept partner's latest
                </button>
                <button
                  type="button"
                  style={ghostBtn}
                  onClick={handleCopyLink}
                  data-testid="copy-link"
                >
                  {shareCopied ? "Link copied!" : "Copy link for partner"}
                </button>
              </div>
            )}

            {pendingAcceptIdx !== null && (
              <div
                data-testid="accept-confirm"
                style={{
                  background: "var(--neutral-bg-2, #ffffff)",
                  borderRadius: "var(--radius-card, 16px)",
                  padding: "var(--space-5, 24px)",
                  border: "2px solid var(--surplus-good, #1bb676)",
                  display: "flex",
                  flexDirection: "column",
                  gap: "var(--space-4, 16px)",
                }}
              >
                <h3 style={{ margin: 0 }}>Accept this offer?</h3>
                <div data-testid="accept-confirm-detail">
                  Partner ({state.history[pendingAcceptIdx].role}) offered{" "}
                  <strong>q = {state.history[pendingAcceptIdx].offer.q}</strong> at{" "}
                  <strong>
                    ${state.history[pendingAcceptIdx].offer.unitPrice}/unit
                  </strong>
                  {state.history[pendingAcceptIdx].offer.note
                    ? ` — "${state.history[pendingAcceptIdx].offer.note}"`
                    : ""}
                  . Accepting commits <strong>your half</strong> of the deal.
                  The deal closes only when the partner also accepts.
                </div>
                <div style={{ display: "flex", gap: "var(--space-3, 12px)", flexWrap: "wrap" }}>
                  <button
                    type="button"
                    style={acceptBtn}
                    onClick={handleAcceptConfirm}
                    data-testid="accept-confirm-yes"
                  >
                    Yes, accept
                  </button>
                  <button
                    type="button"
                    style={ghostBtn}
                    onClick={handleAcceptCancel}
                    data-testid="accept-confirm-no"
                  >
                    Cancel
                  </button>
                </div>
              </div>
            )}

            {!dealClosed &&
              (state.buyerAccepted || state.supplierAccepted) &&
              pendingAcceptIdx === null && (
                <div
                  data-testid="half-accepted-banner"
                  style={{
                    background: "var(--deal-zone, rgba(27, 182, 118, 0.1))",
                    borderLeft: "4px solid var(--surplus-good, #1bb676)",
                    borderRadius: "var(--radius-tile, 12px)",
                    padding: "var(--space-3, 12px) var(--space-4, 16px)",
                  }}
                >
                  <strong>
                    {state.buyerAccepted ? "Buyer" : "Supplier"} accepted.
                  </strong>{" "}
                  Waiting on the {state.buyerAccepted ? "supplier" : "buyer"}{" "}
                  to confirm. The partner can accept the same offer to close
                  the deal, or counter to keep negotiating.
                </div>
              )}

            {dealClosed && (
              <div
                data-testid="deal-closed"
                style={{
                  background: "var(--deal-zone, rgba(27, 182, 118, 0.15))",
                  borderLeft: "4px solid var(--surplus-good, #1bb676)",
                  borderRadius: "var(--radius-card, 16px)",
                  padding: "var(--space-5, 24px)",
                  display: "flex",
                  flexDirection: "column",
                  gap: "var(--space-3, 12px)",
                }}
              >
                <h3 style={{ margin: 0 }}>Deal closed ✓</h3>
                <div>
                  Both parties accepted after {state.history.length} round
                  {state.history.length === 1 ? "" : "s"}. The agreed terms:
                </div>
                {(() => {
                  // Find the last round (the offer that both parties
                  // agreed to) to surface the final terms explicitly.
                  const lastRound = state.history[state.history.length - 1];
                  return (
                    <div
                      data-testid="deal-final-terms"
                      style={{
                        background: "var(--neutral-bg, #f7f7f4)",
                        padding: "var(--space-3, 12px) var(--space-4, 16px)",
                        borderRadius: "var(--radius-tile, 12px)",
                        fontFamily:
                          "ui-monospace, SFMono-Regular, Menlo, Consolas, monospace",
                      }}
                    >
                      quantity: <strong>{lastRound.offer.q}</strong>
                      <br />
                      unit price: <strong>${lastRound.offer.unitPrice}</strong>
                      <br />
                      total: <strong>${lastRound.offer.q * lastRound.offer.unitPrice}</strong>
                      {lastRound.offer.note ? (
                        <>
                          <br />
                          note: "{lastRound.offer.note}"
                        </>
                      ) : null}
                    </div>
                  );
                })()}
              </div>
            )}

            {state.history.length > 0 && (
              <div style={card}>
                <h3 style={{ margin: 0, fontSize: "var(--type-3, 1.05rem)" }}>
                  Round log
                </h3>
                <ol
                  style={{ paddingLeft: "var(--space-5, 24px)", margin: 0 }}
                  data-testid="round-log"
                >
                  {state.history.map((round, idx) => (
                    <li key={idx} style={{ marginBottom: "var(--space-2, 8px)" }}>
                      <strong>{round.role}</strong> — q={round.offer.q}, $
                      {round.offer.unitPrice}/unit
                      {round.offer.note && (
                        <span
                          style={{
                            color: "var(--neutral-fg-soft, #5b5b62)",
                          }}
                        >
                          {" "}
                          — "{round.offer.note}"
                        </span>
                      )}
                    </li>
                  ))}
                </ol>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}
