"use client";

import { useState } from "react";
import {
  ActionIcon,
  Badge,
  Box,
  Group,
  Stack,
  Text,
  Title,
  Card,
} from "@mantine/core";
import { IconMinus, IconPlus } from "@tabler/icons-react";
import { DataTable, type DataTableColumn } from "mantine-datatable";
import type { ScreenDirection, ScreenerPick, ScreenerResult } from "@/types";

function convictionColor(c: number) {
  if (c >= 5) return "green";
  if (c >= 4) return "teal";
  if (c >= 3) return "blue";
  return "gray";
}

function SignedPct({
  pct,
  bold = false,
}: {
  pct: number | undefined;
  bold?: boolean;
}) {
  if (pct == null || Number.isNaN(pct) || !Number.isFinite(pct)) {
    return (
      <Text size="sm" c="dimmed">
        —
      </Text>
    );
  }
  const color = pct >= 0 ? "teal.6" : "red.6";
  const sign = pct >= 0 ? "+" : "";
  return (
    <Text size="sm" c={color} fw={bold ? 700 : 600}>
      {sign}
      {pct.toFixed(1)}%
    </Text>
  );
}

function movePct(p: ScreenerPick): number | undefined {
  if (!p.entry || !p.target) return undefined;
  return ((p.target - p.entry) / p.entry) * 100;
}

function makeColumns(
  side: "BUY" | "SELL",
  currency: string,
  expandedSet: Set<string>,
  toggle: (symbol: string) => void,
): DataTableColumn<ScreenerPick>[] {
  return [
    {
      accessor: "_expand",
      title: "",
      width: 36,
      render: (p) => {
        const open = expandedSet.has(p.symbol);
        return (
          <ActionIcon
            size="sm"
            variant="subtle"
            color="gray"
            onClick={(e) => {
              e.stopPropagation();
              toggle(p.symbol);
            }}
            aria-label={open ? `Collapse ${p.symbol}` : `Expand ${p.symbol}`}
          >
            {open ? <IconMinus size={14} /> : <IconPlus size={14} />}
          </ActionIcon>
        );
      },
    },
    {
      accessor: "symbol",
      title: "Symbol",
      width: 110,
      render: (p) => <Text fw={600}>{p.symbol}</Text>,
    },
    {
      accessor: "dayChangePct",
      title: "Day %",
      width: 80,
      textAlign: "right",
      render: (p) => <SignedPct pct={p.dayChangePct} />,
    },
    {
      accessor: "conviction",
      title: "Conv",
      width: 60,
      textAlign: "center",
      render: (p) => (
        <Badge color={convictionColor(p.conviction)} variant="light">
          {p.conviction}
        </Badge>
      ),
    },
    {
      accessor: "entry",
      title: "Entry",
      width: 90,
      textAlign: "right",
      render: (p) => (
        <Text size="sm">
          {currency}
          {p.entry}
        </Text>
      ),
    },
    {
      accessor: "stop",
      title: "Stop",
      width: 90,
      textAlign: "right",
      render: (p) => (
        <Text size="sm" c={side === "BUY" ? "red" : "green"}>
          {currency}
          {p.stop}
        </Text>
      ),
    },
    {
      accessor: "target",
      title: "Target",
      width: 90,
      textAlign: "right",
      render: (p) => (
        <Text size="sm" c={side === "BUY" ? "green" : "red"} fw={600}>
          {currency}
          {p.target}
        </Text>
      ),
    },
    {
      accessor: "_move",
      title: "Move",
      width: 80,
      textAlign: "right",
      render: (p) => <SignedPct pct={movePct(p)} bold />,
    },
    {
      accessor: "timeframe",
      title: "TF",
      width: 100,
      render: (p) => <Text size="xs">{p.timeframe}</Text>,
    },
  ];
}

interface Props {
  result: ScreenerResult;
  direction: ScreenDirection;
  currency: string;
}

export function ScreenerResults({ result, direction, currency }: Props) {
  const [expanded, setExpanded] = useState<Set<string>>(new Set());
  const showSells = direction === "LONG_SHORT";

  const toggle = (symbol: string) => {
    setExpanded((prev) => {
      const next = new Set(prev);
      if (next.has(symbol)) next.delete(symbol);
      else next.add(symbol);
      return next;
    });
  };

  const buyCols = makeColumns("BUY", currency, expanded, toggle);
  const sellCols = makeColumns("SELL", currency, expanded, toggle);

  const expandedIds = Array.from(expanded);

  const rowExpansion = {
    allowMultiple: true,
    trigger: "never" as const,
    expanded: {
      recordIds: expandedIds,
      onRecordIdsChange: (ids: unknown[]) =>
        setExpanded(new Set(ids.map((id) => String(id)))),
    },
    content: ({ record }: { record: ScreenerPick }) => (
      <Box px="md" py="sm" bg="var(--mantine-color-gray-light)">
        <Stack gap={4}>
          <Text size="sm">{record.thesis}</Text>
          <Text size="xs" c="dimmed">
            Wave: {record.waveCount}
          </Text>
          {record.risks?.length > 0 && (
            <Text size="xs" c="dimmed">
              Risks: {record.risks.join(" · ")}
            </Text>
          )}
        </Stack>
      </Box>
    ),
  };

  return (
    <Stack gap="lg">
      <Card withBorder padding="md" radius="md">
        <Group gap="xs" align="baseline">
          <Title order={5}>Macro read</Title>
          <Text size="xs" c="dimmed">
            {new Date(result.generatedAt).toLocaleString()}
          </Text>
        </Group>
        <Text mt="xs" size="sm">
          {result.macroNote}
        </Text>
      </Card>

      <Stack gap="xs">
        <Group gap="xs">
          <Title order={4}>Top Buys</Title>
          <Badge color="green" variant="light">
            {result.topBuys.length}
          </Badge>
        </Group>
        <DataTable
          withTableBorder
          borderRadius="sm"
          striped
          highlightOnHover
          records={result.topBuys}
          columns={buyCols}
          idAccessor="symbol"
          noRecordsText="No buy candidates this run."
          minHeight={120}
          rowExpansion={rowExpansion}
        />
      </Stack>

      {showSells && (
        <Stack gap="xs">
          <Group gap="xs">
            <Title order={4}>Top Sells</Title>
            <Badge color="red" variant="light">
              {result.topSells.length}
            </Badge>
          </Group>
          <DataTable
            withTableBorder
            borderRadius="sm"
            striped
            highlightOnHover
            records={result.topSells}
            columns={sellCols}
            idAccessor="symbol"
            noRecordsText="No sell candidates this run."
            minHeight={120}
            rowExpansion={rowExpansion}
          />
        </Stack>
      )}
    </Stack>
  );
}
