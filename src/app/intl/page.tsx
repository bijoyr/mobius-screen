"use client";

import { useEffect, useState } from "react";
import {
  Alert,
  Badge,
  Button,
  Card,
  Container,
  FileInput,
  Group,
  List,
  Stack,
  Text,
  Title,
} from "@mantine/core";
import { DataTable, type DataTableColumn } from "mantine-datatable";
import { notifications } from "@mantine/notifications";
import {
  IconAlertCircle,
  IconDownload,
  IconUpload,
} from "@tabler/icons-react";
import type { Stock } from "@/types";

const TEMPLATE_CSV = `symbol,yahooSymbol,name,exchange,sector
AAPL,AAPL,Apple Inc.,NASDAQ,Technology
MSFT,MSFT,Microsoft Corp.,NASDAQ,Technology
ASML,ASML.AS,ASML Holding,EURONEXT,Semiconductors
TSM,TSM,Taiwan Semiconductor,NYSE,Semiconductors
7203,7203.T,Toyota Motor,TSE,Automobiles
`;

interface UploadResponse {
  count?: number;
  accepted?: number;
  errors?: Array<{ line: number; reason: string }>;
  error?: string;
}

export default function IntlPage() {
  const [stocks, setStocks] = useState<Stock[]>([]);
  const [file, setFile] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);
  const [parseErrors, setParseErrors] = useState<
    Array<{ line: number; reason: string }>
  >([]);

  useEffect(() => {
    refresh();
  }, []);

  async function refresh() {
    try {
      const res = await fetch("/api/intl/universe");
      const json = (await res.json()) as { stocks: Stock[] };
      setStocks(json.stocks ?? []);
    } catch {
      // ignore
    }
  }

  async function upload() {
    if (!file) return;
    setUploading(true);
    setParseErrors([]);
    try {
      const form = new FormData();
      form.append("file", file);
      const res = await fetch("/api/intl/universe", {
        method: "POST",
        body: form,
      });
      const json = (await res.json()) as UploadResponse;
      if (!res.ok) {
        if (json.errors?.length) setParseErrors(json.errors);
        notifications.show({
          color: "red",
          title: "Upload failed",
          message: json.error ?? `HTTP ${res.status}`,
        });
        return;
      }
      setParseErrors(json.errors ?? []);
      setFile(null);
      await refresh();
      notifications.show({
        color: "green",
        title: "Watchlist updated",
        message: `${json.count ?? 0} stocks loaded${
          json.errors?.length ? ` · ${json.errors.length} rows skipped` : ""
        }`,
      });
    } catch (err) {
      notifications.show({
        color: "red",
        title: "Upload failed",
        message: err instanceof Error ? err.message : "Unknown error",
      });
    } finally {
      setUploading(false);
    }
  }

  function downloadTemplate() {
    const blob = new Blob([TEMPLATE_CSV], { type: "text/csv;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "intl-watchlist-template.csv";
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }

  const columns: DataTableColumn<Stock>[] = [
    {
      accessor: "symbol",
      title: "Symbol",
      width: 120,
      render: (r) => <Text fw={600}>{r.symbol}</Text>,
    },
    {
      accessor: "yahooSymbol",
      title: "Yahoo",
      width: 140,
      render: (r) => (
        <Text size="sm" ff="monospace">
          {r.yahooSymbol}
        </Text>
      ),
    },
    {
      accessor: "name",
      title: "Name",
      render: (r) => (
        <Text size="sm" c={r.name ? undefined : "dimmed"}>
          {r.name || "—"}
        </Text>
      ),
    },
    {
      accessor: "exchange",
      title: "Exchange",
      width: 110,
      render: (r) => (
        <Badge variant="light" color="gray">
          {r.exchange}
        </Badge>
      ),
    },
    {
      accessor: "sector",
      title: "Sector",
      width: 160,
      render: (r) => (
        <Text size="sm" c={r.sector ? undefined : "dimmed"}>
          {r.sector || "—"}
        </Text>
      ),
    },
  ];

  return (
    <Container size="lg" py="md">
      <Stack gap="lg">
        <Stack gap={2}>
          <Title order={2}>International Watchlist</Title>
          <Text c="dimmed" size="sm">
            Upload a CSV of stocks you want to screen. The list replaces the
            previous universe and persists across sessions. Used as the scope
            for the INTL screener tab (BUY-only).
          </Text>
        </Stack>

        <Card withBorder padding="md" radius="md">
          <Stack gap="md">
            <Group align="end" wrap="wrap">
              <FileInput
                label="CSV or Excel file"
                placeholder="Choose a .csv or .xlsx"
                accept=".csv,text/csv,.xlsx,.xlsm,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
                value={file}
                onChange={setFile}
                w={300}
                clearable
              />
              <Button
                leftSection={<IconUpload size={16} />}
                onClick={upload}
                loading={uploading}
                disabled={!file}
              >
                Upload &amp; Replace
              </Button>
              <Button
                variant="default"
                leftSection={<IconDownload size={16} />}
                onClick={downloadTemplate}
              >
                Download template
              </Button>
            </Group>
            <Text size="xs" c="dimmed">
              Header must include <b>symbol</b> and <b>yahooSymbol</b>.
              Optional: <b>name</b>, <b>exchange</b>, <b>sector</b>. Re-uploads
              replace the entire list.
            </Text>
          </Stack>
        </Card>

        {parseErrors.length > 0 && (
          <Alert
            color="yellow"
            icon={<IconAlertCircle />}
            title={`${parseErrors.length} row${parseErrors.length === 1 ? "" : "s"} skipped`}
          >
            <List size="xs" spacing={2}>
              {parseErrors.slice(0, 10).map((e) => (
                <List.Item key={`${e.line}-${e.reason}`}>
                  Line {e.line}: {e.reason}
                </List.Item>
              ))}
              {parseErrors.length > 10 && (
                <List.Item>… and {parseErrors.length - 10} more</List.Item>
              )}
            </List>
          </Alert>
        )}

        <Group gap="xs" align="baseline">
          <Title order={4}>Current watchlist</Title>
          <Badge variant="light" color="gray">
            {stocks.length}
          </Badge>
        </Group>

        <DataTable
          withTableBorder
          borderRadius="sm"
          striped
          highlightOnHover
          records={stocks}
          columns={columns}
          idAccessor="symbol"
          noRecordsText="No stocks uploaded yet. Use the template above as a starting point."
          minHeight={200}
        />
      </Stack>
    </Container>
  );
}
