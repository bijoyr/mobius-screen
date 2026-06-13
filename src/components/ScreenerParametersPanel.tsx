"use client";

import { useEffect, useRef, useState } from "react";
import {
  Accordion,
  Badge,
  Button,
  Code,
  Group,
  NumberInput,
  SegmentedControl,
  Stack,
  Text,
  Textarea,
} from "@mantine/core";
import { IconAdjustments, IconRestore, IconWand } from "@tabler/icons-react";
import type { MarketId, ScreenerParameters, Strictness } from "@/types";

export const DEFAULT_LONG_SHORT: Required<ScreenerParameters> = {
  minRR: 1.8,
  minConviction: 1,
  maxPicks: 5,
  strictness: "BALANCED",
  focusThemes: "",
  avoidThemes: "",
  systemPromptOverride: "",
};

export const DEFAULT_LONG_ONLY: Required<ScreenerParameters> = {
  minRR: 2,
  minConviction: 1,
  maxPicks: 5,
  strictness: "BALANCED",
  focusThemes: "",
  avoidThemes: "",
  systemPromptOverride: "",
};

interface Props {
  value: Required<ScreenerParameters>;
  onChange: (next: Required<ScreenerParameters>) => void;
  defaults: Required<ScreenerParameters>;
  market: MarketId;
}

export function ScreenerParametersPanel({
  value,
  onChange,
  defaults,
  market,
}: Props) {
  const [generatedPrompt, setGeneratedPrompt] = useState<string>("");
  const [previewLoading, setPreviewLoading] = useState(false);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  function patch(partial: Partial<Required<ScreenerParameters>>) {
    onChange({ ...value, ...partial });
  }

  // Debounced fetch of the auto-generated prompt so the preview reflects the
  // current strictness/focus/avoid/R:R/conviction settings.
  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    setPreviewLoading(true);
    debounceRef.current = setTimeout(async () => {
      try {
        const res = await fetch("/api/preview-prompt", {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({
            market,
            parameters: {
              minRR: value.minRR,
              minConviction: value.minConviction,
              maxPicks: value.maxPicks,
              strictness: value.strictness,
              focusThemes: value.focusThemes,
              avoidThemes: value.avoidThemes,
            },
          }),
        });
        const json = (await res.json()) as { systemPrompt?: string };
        if (json.systemPrompt) setGeneratedPrompt(json.systemPrompt);
      } catch {
        // ignore — preview is non-critical
      } finally {
        setPreviewLoading(false);
      }
    }, 400);
    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, [
    market,
    value.minRR,
    value.minConviction,
    value.maxPicks,
    value.strictness,
    value.focusThemes,
    value.avoidThemes,
  ]);

  const overrideActive = !!value.systemPromptOverride.trim();

  return (
    <Accordion variant="separated" radius="md">
      <Accordion.Item value="tune">
        <Accordion.Control icon={<IconAdjustments size={18} />}>
          <Group justify="space-between">
            <Text fw={600}>Tune screener</Text>
            <Text size="xs" c="dimmed">
              R:R {value.minRR} · conv ≥ {value.minConviction} · max{" "}
              {value.maxPicks} · {value.strictness.toLowerCase()}
              {overrideActive ? " · custom prompt" : ""}
            </Text>
          </Group>
        </Accordion.Control>
        <Accordion.Panel>
          <Stack gap="md">
            <Group grow wrap="wrap">
              <NumberInput
                label="Min R:R"
                description="Reject picks below this risk/reward."
                min={0.5}
                max={10}
                step={0.1}
                decimalScale={2}
                value={value.minRR}
                onChange={(v) =>
                  patch({ minRR: typeof v === "number" ? v : Number(v) || 0 })
                }
              />
              <NumberInput
                label="Min conviction"
                description="Drop picks below this (1-5)."
                min={1}
                max={5}
                value={value.minConviction}
                onChange={(v) =>
                  patch({
                    minConviction:
                      typeof v === "number" ? v : Number(v) || 1,
                  })
                }
              />
              <NumberInput
                label="Max picks per side"
                description="Cap on buys (and sells, if applicable)."
                min={1}
                max={10}
                value={value.maxPicks}
                onChange={(v) =>
                  patch({
                    maxPicks: typeof v === "number" ? v : Number(v) || 5,
                  })
                }
              />
            </Group>

            <Stack gap={4}>
              <Text size="sm" fw={500}>
                Strictness
              </Text>
              <SegmentedControl
                value={value.strictness}
                onChange={(v) => patch({ strictness: v as Strictness })}
                data={[
                  { value: "LOOSE", label: "Loose" },
                  { value: "BALANCED", label: "Balanced" },
                  { value: "STRICT", label: "Strict" },
                ]}
              />
              <Text size="xs" c="dimmed">
                Loose surfaces plausible setups even if not textbook. Strict
                rejects anything without all confirmations aligned — expect
                fewer (or zero) picks.
              </Text>
            </Stack>

            <Textarea
              label="Focus / favour"
              description="Free-form. Themes or sectors Claude should lean into."
              placeholder="e.g. domestic capex, defence, real-estate cycle"
              minRows={2}
              autosize
              value={value.focusThemes}
              onChange={(e) => patch({ focusThemes: e.currentTarget.value })}
            />

            <Textarea
              label="Avoid / deprioritise"
              description="Free-form. Themes or sectors Claude should skip or downweight."
              placeholder="e.g. consumer staples, anything with regulatory overhang"
              minRows={2}
              autosize
              value={value.avoidThemes}
              onChange={(e) => patch({ avoidThemes: e.currentTarget.value })}
            />

            <Accordion variant="contained" radius="sm">
              <Accordion.Item value="prompt">
                <Accordion.Control icon={<IconWand size={16} />}>
                  <Group justify="space-between">
                    <Text size="sm" fw={600}>
                      System prompt (advanced)
                    </Text>
                    <Badge
                      size="xs"
                      variant="light"
                      color={overrideActive ? "orange" : "gray"}
                    >
                      {overrideActive ? "Custom" : "Auto"}
                    </Badge>
                  </Group>
                </Accordion.Control>
                <Accordion.Panel>
                  <Stack gap="sm">
                    <Text size="xs" c="dimmed">
                      The system prompt Claude receives is normally assembled
                      from the controls above. The preview below shows the
                      exact text that will be sent for the current settings.
                      To take full control, paste/edit it into the override
                      box — that text is sent verbatim and the controls above
                      stop affecting the system prompt (they still affect the
                      user-message constraints).
                    </Text>

                    <Stack gap={4}>
                      <Group justify="space-between">
                        <Text size="xs" fw={600}>
                          Generated prompt preview{" "}
                          {previewLoading ? (
                            <Text component="span" size="xs" c="dimmed">
                              (updating…)
                            </Text>
                          ) : null}
                        </Text>
                        <Button
                          size="compact-xs"
                          variant="light"
                          onClick={() =>
                            patch({ systemPromptOverride: generatedPrompt })
                          }
                          disabled={!generatedPrompt}
                        >
                          Copy into override ↓
                        </Button>
                      </Group>
                      <Code
                        block
                        style={{
                          maxHeight: 240,
                          overflow: "auto",
                          fontSize: 11,
                          whiteSpace: "pre-wrap",
                        }}
                      >
                        {generatedPrompt || "Loading…"}
                      </Code>
                    </Stack>

                    <Textarea
                      label="Override system prompt"
                      description="Leave empty to use the auto-generated prompt above. When non-empty, this text is sent to Claude verbatim."
                      placeholder="(empty — auto-generated prompt is used)"
                      minRows={8}
                      autosize
                      maxRows={24}
                      styles={{ input: { fontFamily: "monospace", fontSize: 12 } }}
                      value={value.systemPromptOverride}
                      onChange={(e) =>
                        patch({ systemPromptOverride: e.currentTarget.value })
                      }
                    />

                    <Group justify="flex-end" gap="xs">
                      <Button
                        size="compact-xs"
                        variant="subtle"
                        onClick={() => patch({ systemPromptOverride: "" })}
                        disabled={!overrideActive}
                      >
                        Clear override
                      </Button>
                    </Group>
                  </Stack>
                </Accordion.Panel>
              </Accordion.Item>
            </Accordion>

            <Group justify="flex-end">
              <Button
                variant="subtle"
                size="xs"
                leftSection={<IconRestore size={14} />}
                onClick={() => onChange(defaults)}
              >
                Reset to defaults
              </Button>
            </Group>
          </Stack>
        </Accordion.Panel>
      </Accordion.Item>
    </Accordion>
  );
}
