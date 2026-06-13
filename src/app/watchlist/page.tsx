"use client";

import { useEffect, useMemo, useState } from "react";
import {
  ActionIcon,
  Autocomplete,
  Badge,
  Button,
  Card,
  Container,
  Group,
  Select,
  Stack,
  Text,
  TextInput,
  Title,
} from "@mantine/core";
import { DataTable, type DataTableColumn } from "mantine-datatable";
import { notifications } from "@mantine/notifications";
import { IconPlus, IconTrash } from "@tabler/icons-react";
import type { Stock, WatchlistEntry } from "@/types";

type Tag = WatchlistEntry["tag"];

const TAG_OPTIONS: Tag[] = ["BUY", "SELL", "WATCH"];

function tagColor(tag: Tag) {
  return tag === "BUY" ? "green" : tag === "SELL" ? "red" : "gray";
}

export default function WatchlistPage() {
  const [entries, setEntries] = useState<WatchlistEntry[]>([]);
  const [universe, setUniverse] = useState<Stock[]>([]);
  const [symbol, setSymbol] = useState("");
  const [tag, setTag] = useState<Tag>("WATCH");
  const [notes, setNotes] = useState("");
  const [adding, setAdding] = useState(false);

  useEffect(() => {
    refresh();
    fetch("/api/fo-stocks")
      .then((r) => r.json())
      .then((j: { stocks: Stock[] }) => setUniverse(j.stocks))
      .catch(() => undefined);
  }, []);

  async function refresh() {
    const res = await fetch("/api/watchlist");
    const j = (await res.json()) as { entries: WatchlistEntry[] };
    setEntries(j.entries);
  }

  async function addEntry() {
    if (!symbol.trim()) return;
    setAdding(true);
    try {
      const res = await fetch("/api/watchlist", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ symbol: symbol.trim(), tag, notes }),
      });
      if (!res.ok) {
        const j = (await res.json()) as { error?: string };
        throw new Error(j.error ?? `HTTP ${res.status}`);
      }
      setSymbol("");
      setNotes("");
      await refresh();
      notifications.show({ color: "green", title: "Added", message: symbol.toUpperCase() });
    } catch (err) {
      notifications.show({
        color: "red",
        title: "Add failed",
        message: err instanceof Error ? err.message : "Unknown error",
      });
    } finally {
      setAdding(false);
    }
  }

  async function removeEntry(sym: string) {
    await fetch(`/api/watchlist?symbol=${encodeURIComponent(sym)}`, {
      method: "DELETE",
    });
    await refresh();
    notifications.show({ color: "gray", title: "Removed", message: sym });
  }

  const symbolSuggestions = useMemo(
    () => Array.from(new Set(universe.map((s) => s.symbol))),
    [universe],
  );

  const columns: DataTableColumn<WatchlistEntry>[] = [
    {
      accessor: "symbol",
      title: "Symbol",
      width: 140,
      render: (r) => <Text fw={600}>{r.symbol}</Text>,
    },
    {
      accessor: "tag",
      title: "Tag",
      width: 100,
      render: (r) => (
        <Badge color={tagColor(r.tag)} variant="light">
          {r.tag}
        </Badge>
      ),
    },
    {
      accessor: "notes",
      title: "Notes",
      render: (r) => (
        <Text size="sm" c={r.notes ? undefined : "dimmed"}>
          {r.notes || "—"}
        </Text>
      ),
    },
    {
      accessor: "addedAt",
      title: "Added",
      width: 140,
      render: (r) => (
        <Text size="xs" c="dimmed">
          {new Date(r.addedAt).toLocaleDateString()}
        </Text>
      ),
    },
    {
      accessor: "actions",
      title: "",
      width: 50,
      render: (r) => (
        <ActionIcon
          color="red"
          variant="subtle"
          onClick={(e) => {
            e.stopPropagation();
            removeEntry(r.symbol);
          }}
          aria-label={`Remove ${r.symbol}`}
        >
          <IconTrash size={16} />
        </ActionIcon>
      ),
    },
  ];

  return (
    <Container size="lg" py="md">
      <Stack gap="lg">
        <Stack gap={2}>
          <Title order={2}>Watchlist</Title>
          <Text c="dimmed" size="sm">
            Track tickers and tag them as Buy / Sell / Watch.
          </Text>
        </Stack>

        <Card withBorder padding="md" radius="md">
          <Group align="end" wrap="wrap">
            <Autocomplete
              label="Symbol"
              placeholder="RELIANCE"
              value={symbol}
              onChange={(v) => setSymbol(v.toUpperCase())}
              data={symbolSuggestions}
              w={200}
              limit={20}
            />
            <Select
              label="Tag"
              data={TAG_OPTIONS}
              value={tag}
              onChange={(v) => v && setTag(v as Tag)}
              w={120}
            />
            <TextInput
              label="Notes (optional)"
              value={notes}
              onChange={(e) => setNotes(e.currentTarget.value)}
              style={{ flex: 1, minWidth: 200 }}
            />
            <Button
              leftSection={<IconPlus size={16} />}
              onClick={addEntry}
              loading={adding}
            >
              Add
            </Button>
          </Group>
        </Card>

        <DataTable
          withTableBorder
          borderRadius="sm"
          striped
          highlightOnHover
          records={entries}
          columns={columns}
          idAccessor="id"
          noRecordsText="Watchlist is empty. Add a symbol above."
          minHeight={200}
        />
      </Stack>
    </Container>
  );
}
