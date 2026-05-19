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
  appendRound,
  applyAccept,
  decodeSession,
  encodeSession,
  isDealClosed,
  latestOfferFor,
  newSession,
  type NegotiationRole,
  type NegotiationState,
} from "@lab/engine";
import { AgentFigure } from "../../primitives/AgentFigure";

const BROADCAST_CHANNEL = "proc-lab.negotiate.v1";
const SESSION_STORAGE_KEY = "proc-lab.negotiate.role";

interface NegotiateSurfaceProps {
  onOpenHome: () => void;
}

function readSessionFromURL(): NegotiationState | null {
  if (typeof window === "undefined") return null;
  const params = new URLSearchParams(window.location.search);
  const encoded = params.get("n");
  if (!encoded) return null;
  return decodeSession(encoded);
}

function writeSessionToURL(state: NegotiationState): void {
  if (typeof window === "undefined") return;
  const encoded = encodeSession(state);
  const url = new URL(window.location.href);
  url.searchParams.set("n", encoded);
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
  const [state, setState] = useState<NegotiationState>(() => {
    return readSessionFromURL() ?? newSession();
  });
  const [role, setRoleState] = useState<NegotiationRole | null>(() =>
    readRolePreference(),
  );
  const [draftQ, setDraftQ] = useState<number>(400);
  const [draftPrice, setDraftPrice] = useState<number>(85);
  const [draftNote, setDraftNote] = useState<string>("");
  const [shareCopied, setShareCopied] = useState(false);
  const channelRef = useRef<BroadcastChannel | null>(null);

  // Sync from URL once on mount.
  useEffect(() => {
    const urlState = readSessionFromURL();
    if (urlState) setState(urlState);
  }, []);

  // Set up a BroadcastChannel so two tabs on the same machine keep
  // up in real time.
  useEffect(() => {
    if (typeof BroadcastChannel === "undefined") return;
    const channel = new BroadcastChannel(BROADCAST_CHANNEL);
    channelRef.current = channel;
    channel.onmessage = (event) => {
      const next = decodeSession(event.data);
      if (!next) return;
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
    const encoded = encodeSession(state);
    channelRef.current?.postMessage(encoded);
  }, [state]);

  const otherRole: NegotiationRole | null =
    role === "buyer" ? "supplier" : role === "supplier" ? "buyer" : null;
  const myLastOffer = role ? latestOfferFor(state, role) : null;
  const partnerLastOffer = otherRole ? latestOfferFor(state, otherRole) : null;
  const dealClosed = isDealClosed(state);

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
    setState((prev) => appendRound(prev, round));
    setDraftNote("");
  };

  const handleAccept = () => {
    if (!role) return;
    setState((prev) => applyAccept(prev, role));
  };

  const handleNewSession = () => {
    const fresh = newSession();
    setState(fresh);
    setRoleState(null);
    if (typeof sessionStorage !== "undefined") {
      sessionStorage.removeItem(SESSION_STORAGE_KEY);
    }
    if (typeof window !== "undefined") {
      const url = new URL(window.location.href);
      url.searchParams.delete("n");
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

        {role === null ? (
          <div style={card} data-testid="negotiate-role-picker">
            <h2 style={{ margin: 0, fontSize: "var(--type-3, 1.05rem)" }}>
              Pick your role
            </h2>
            <div style={{ display: "flex", gap: "var(--space-3, 12px)", flexWrap: "wrap" }}>
              <button
                type="button"
                style={button}
                onClick={() => handlePickRole("buyer")}
                data-testid="role-buyer"
              >
                I'm the buyer
              </button>
              <button
                type="button"
                style={{ ...button, background: "var(--role-supplier, #f4a85f)" }}
                onClick={() => handlePickRole("supplier")}
                data-testid="role-supplier"
              >
                I'm the supplier
              </button>
            </div>
          </div>
        ) : (
          <>
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

            {!dealClosed && (
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
                >
                  Submit offer
                </button>
                <button
                  type="button"
                  style={acceptBtn}
                  onClick={handleAccept}
                  data-testid="accept-offer"
                  disabled={state.history.length === 0}
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

            {dealClosed && (
              <div
                data-testid="deal-closed"
                style={{
                  background: "var(--deal-zone, rgba(27, 182, 118, 0.1))",
                  borderLeft: "4px solid var(--surplus-good, #1bb676)",
                  borderRadius: "var(--radius-tile, 12px)",
                  padding: "var(--space-4, 16px)",
                }}
              >
                Deal closed after {state.history.length} round
                {state.history.length === 1 ? "" : "s"}. Both parties
                accepted.
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
