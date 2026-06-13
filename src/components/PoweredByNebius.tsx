import { Text } from "@mantine/core";

/**
 * "Powered by Nebius AI" badge — a Canary accent dot + neutral label in a subtle
 * pill, linking to nebius.com. Uses the brand colour as an accent only (per
 * Nebius trademark guidance we don't reproduce the official logo).
 */
export function PoweredByNebius({ size = "xs" }: { size?: "xs" | "sm" }) {
  return (
    <a
      href="https://nebius.com"
      target="_blank"
      rel="noopener noreferrer"
      style={{
        display: "inline-flex",
        alignItems: "center",
        gap: 6,
        textDecoration: "none",
        border: "1px solid var(--mantine-color-default-border)",
        borderRadius: "var(--mantine-radius-xl)",
        padding: "3px 10px",
        width: "fit-content",
      }}
    >
      <span
        style={{
          width: 8,
          height: 8,
          borderRadius: "50%",
          background: "var(--mantine-color-canary-5)",
          boxShadow: "0 0 6px var(--mantine-color-canary-5)",
          flexShrink: 0,
        }}
      />
      <Text component="span" size={size} fw={600} c="var(--mantine-color-text)">
        Powered by Nebius AI
      </Text>
    </a>
  );
}
