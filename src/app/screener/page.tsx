"use client";

import { useEffect, useMemo, useState } from "react";
import {
  Accordion,
  Alert,
  Button,
  Container,
  Group,
  NumberInput,
  Stack,
  Text,
  Title,
  Loader,
  Card,
  SegmentedControl,
  Switch,
  Badge,
  Code,
  List,
  Center,
} from "@mantine/core";
import { notifications } from "@mantine/notifications";
import { IconAlertCircle, IconLock, IconRadar } from "@tabler/icons-react";
import { useSession } from "next-auth/react";
import { SignInButton } from "@/components/SignInButton";
import type {
  MarketId,
  ScreenDirection,
  ScreenerParameters,
  ScreenerResult,
} from "@/types";
import { ScreenerResults } from "@/components/ScreenerResults";
import {
  DEFAULT_LONG_ONLY,
  DEFAULT_LONG_SHORT,
  ScreenerParametersPanel,
} from "@/components/ScreenerParametersPanel";

interface SampleError {
  symbol: string;
  error: string;
}

interface DataSourceInfo {
  window: {
    inWindow: boolean;
    reason: string;
    marketLocalTime: string;
  };
  counts: { live: number; cache: number; stale: number };
  oldestCacheAt: string | null;
}

interface ScreenResponse {
  id: number;
  market: MarketId;
  result: ScreenerResult;
  debug?: {
    rawResponse: string;
    preFilterBuys: number;
    preFilterSells: number;
  };
  stats: {
    universeRequested: number;
    stocksFetched: number;
    stocksFailed?: number;
    fetchMs: number;
    aiMs: number;
    totalMs: number;
  };
  dataSource?: DataSourceInfo;
  sampleErrors?: SampleError[];
  droppedSymbols?: string[];
}

interface ScreenErrorBody {
  error: string;
  sampleErrors?: SampleError[];
  hint?: string;
}

interface MarketSummary {
  id: MarketId;
  label: string;
  direction: ScreenDirection;
  count: number;
}

const CACHE_KEY = "nse-screener:last-runs";

interface CachedRun {
  result: ScreenerResult;
  stats: ScreenResponse["stats"] | null;
  dataSource: DataSourceInfo | null;
  debug: ScreenResponse["debug"] | null;
  droppedSymbols: string[];
}

type RunCache = Partial<Record<MarketId, CachedRun>>;

function readCache(): RunCache {
  if (typeof window === "undefined") return {};
  try {
    const raw = window.localStorage.getItem(CACHE_KEY);
    return raw ? (JSON.parse(raw) as RunCache) : {};
  } catch {
    return {};
  }
}

function writeCache(next: RunCache) {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(CACHE_KEY, JSON.stringify(next));
  } catch {
    // quota or serialization issue — ignore
  }
}

export default function ScreenerPage() {
  const { data: session, status } = useSession();
  const [running, setRunning] = useState(false);
  const initialMarket: MarketId = "IN";
  const initialCache: CachedRun | undefined = readCache()[initialMarket];
  const [result, setResult] = useState<ScreenerResult | null>(
    initialCache?.result ?? null,
  );
  const [stats, setStats] = useState<ScreenResponse["stats"] | null>(
    initialCache?.stats ?? null,
  );
  const [dataSource, setDataSource] = useState<DataSourceInfo | null>(
    initialCache?.dataSource ?? null,
  );
  const [debug, setDebug] = useState<ScreenResponse["debug"] | null>(
    initialCache?.debug ?? null,
  );
  const [droppedSymbols, setDroppedSymbols] = useState<string[]>(
    initialCache?.droppedSymbols ?? [],
  );
  const [error, setError] = useState<string | null>(null);
  const [errorDetails, setErrorDetails] = useState<ScreenErrorBody | null>(null);
  const [limit, setLimit] = useState<number | string>(40);
  const [useLimit, setUseLimit] = useState(true);
  const [market, setMarket] = useState<MarketId>(initialMarket);
  const [markets, setMarkets] = useState<MarketSummary[]>([]);
  const [params, setParams] = useState<Required<ScreenerParameters>>(
    DEFAULT_LONG_SHORT,
  );

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const res = await fetch("/api/fo-stocks");
        const json = (await res.json()) as { markets: MarketSummary[] };
        if (!cancelled) setMarkets(json.markets);
      } catch {
        // ignore
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  // When the user toggles markets, read that market's last run from
  // localStorage — no network round-trip. Cache is refreshed only on Run Screen.
  useEffect(() => {
    const cached = readCache()[market];
    setResult(cached?.result ?? null);
    setStats(cached?.stats ?? null);
    setDataSource(cached?.dataSource ?? null);
    setDebug(cached?.debug ?? null);
    setDroppedSymbols(cached?.droppedSymbols ?? []);
    setError(null);
    setErrorDetails(null);
  }, [market]);

  const currentMarket = useMemo(
    () => markets.find((m) => m.id === market),
    [markets, market],
  );
  const direction: ScreenDirection = currentMarket?.direction ?? "LONG_SHORT";
  const currency = market === "US" ? "$" : "₹";
  const defaults = direction === "LONG_ONLY" ? DEFAULT_LONG_ONLY : DEFAULT_LONG_SHORT;

  // Seed params from server when signed in; otherwise fall back to the
  // market's defaults. Fires on market change.
  useEffect(() => {
    let cancelled = false;
    if (status !== "authenticated") {
      setParams(defaults);
      return;
    }
    (async () => {
      try {
        const res = await fetch(
          `/api/user/preferences?market=${encodeURIComponent(market)}`,
        );
        if (!res.ok) {
          if (!cancelled) setParams(defaults);
          return;
        }
        const json = (await res.json()) as {
          params: Required<ScreenerParameters> | null;
        };
        if (cancelled) return;
        setParams(json.params ?? defaults);
      } catch {
        if (!cancelled) setParams(defaults);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [market, defaults, status]);

  async function runScreen() {
    setRunning(true);
    setError(null);
    setErrorDetails(null);
    try {
      const body: {
        market: MarketId;
        limit?: number;
        parameters: ScreenerParameters;
      } = { market, parameters: params };
      if (useLimit && typeof limit === "number") body.limit = limit;
      const res = await fetch("/api/screen", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(body),
      });
      const json = (await res.json()) as ScreenResponse | ScreenErrorBody;
      if (!res.ok || "error" in json) {
        const errBody = json as ScreenErrorBody;
        setError(errBody.error);
        setErrorDetails(errBody);
        notifications.show({
          color: "red",
          title: "Screen failed",
          message: errBody.error,
        });
      } else {
        const ok = json as ScreenResponse;
        setResult(ok.result);
        setStats(ok.stats);
        setDataSource(ok.dataSource ?? null);
        setDebug(ok.debug ?? null);
        setDroppedSymbols(ok.droppedSymbols ?? []);
        const cache = readCache();
        cache[market] = {
          result: ok.result,
          stats: ok.stats,
          dataSource: ok.dataSource ?? null,
          debug: ok.debug ?? null,
          droppedSymbols: ok.droppedSymbols ?? [],
        };
        writeCache(cache);
        notifications.show({
          color: "green",
          title: "Screen complete",
          message: `Analyzed ${ok.stats.stocksFetched} stocks in ${(ok.stats.totalMs / 1000).toFixed(1)}s`,
        });
      }
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Unknown error";
      setError(msg);
      notifications.show({ color: "red", title: "Screen failed", message: msg });
    } finally {
      setRunning(false);
    }
  }

  const marketTabs = markets.length
    ? markets.map((m) => ({ value: m.id, label: m.label }))
    : [
        { value: "IN", label: "India · NSE F&O" },
        { value: "US", label: "US · S&P 500" },
      ];

  if (status === "loading") {
    return (
      <Container size="lg" py="md">
        <Center mih={200}>
          <Loader />
        </Center>
      </Container>
    );
  }

  if (status !== "authenticated") {
    return (
      <Container size="sm" py="xl">
        <Card withBorder padding="xl" radius="md">
          <Stack align="center" gap="md">
            <IconLock size={36} stroke={1.4} />
            <Title order={3}>Sign in to run the screener</Title>
            <Text c="dimmed" size="sm" ta="center">
              Your screener history and saved parameters are per-account.
              Other sections of the app are open without sign-in.
            </Text>
            <SignInButton />
          </Stack>
        </Card>
      </Container>
    );
  }

  return (
    <Container size="lg" py="md">
      <Stack gap="lg">
        <Stack gap={2}>
          <Title order={2}>Screener</Title>
          <Text c="dimmed" size="sm">
            Runs Claude over the selected market with pre-computed RSI / MACD / Fib
            data, ranks top buys{direction === "LONG_SHORT" ? " and sells" : ""}.
            {session?.user?.email && (
              <>
                {" · "}
                <Text span size="sm" c="dimmed">
                  signed in as {session.user.email}
                </Text>
              </>
            )}
          </Text>
        </Stack>

        <Card withBorder padding="md" radius="md">
          <Stack gap="md">
            <Group gap="xs" wrap="wrap">
              <SegmentedControl
                value={market}
                onChange={(v) => setMarket(v as MarketId)}
                data={marketTabs}
              />
              {currentMarket && (
                <Badge variant="light" color={direction === "LONG_ONLY" ? "blue" : "grape"}>
                  {direction === "LONG_ONLY" ? "Long-only" : "Long + Short"} · {currentMarket.count} stocks
                </Badge>
              )}
            </Group>

            <Group justify="space-between" wrap="wrap">
              <Group>
                <Button
                  leftSection={<IconRadar size={18} />}
                  onClick={runScreen}
                  loading={running}
                  size="md"
                >
                  Run Screen ({market})
                </Button>
                {running && (
                  <Group gap="xs">
                    <Loader size="sm" />
                    <Text size="sm" c="dimmed">
                      Fetching prices and ranking…
                    </Text>
                  </Group>
                )}
              </Group>
              <Group>
                <Switch
                  checked={useLimit}
                  onChange={(e) => setUseLimit(e.currentTarget.checked)}
                  label="Cap universe"
                />
                <NumberInput
                  size="sm"
                  w={120}
                  min={5}
                  max={200}
                  value={limit}
                  onChange={setLimit}
                  disabled={!useLimit}
                />
              </Group>
            </Group>
            <Text size="xs" c="dimmed">
              First run: ~30-60s for 40 stocks. Yahoo throttles aggressive
              parallel requests, so uncap only when you have a few minutes.
            </Text>
          </Stack>
        </Card>

        <ScreenerParametersPanel
          value={params}
          onChange={setParams}
          defaults={defaults}
          market={market}
        />

        {stats && (
          <Text size="xs" c="dimmed">
            {stats.stocksFetched}/{stats.universeRequested} stocks fetched
            {stats.stocksFailed ? ` · ${stats.stocksFailed} failed` : ""} ·
            fetch {(stats.fetchMs / 1000).toFixed(1)}s · AI{" "}
            {(stats.aiMs / 1000).toFixed(1)}s · total{" "}
            {(stats.totalMs / 1000).toFixed(1)}s
          </Text>
        )}

        {dataSource && (
          <Group gap="xs" wrap="wrap">
            <Badge
              variant="light"
              color={dataSource.window.inWindow ? "green" : "yellow"}
            >
              {dataSource.window.inWindow ? "Live fetch window" : "Cached data"}
            </Badge>
            <Text size="xs" c="dimmed">
              {dataSource.window.reason} · market time{" "}
              {dataSource.window.marketLocalTime} · live={dataSource.counts.live}{" "}
              cache={dataSource.counts.cache}
              {dataSource.oldestCacheAt
                ? ` · oldest cache ${new Date(dataSource.oldestCacheAt).toLocaleString()}`
                : ""}
            </Text>
          </Group>
        )}

        {error && (
          <Alert icon={<IconAlertCircle />} color="red" title="Screen failed">
            <Stack gap="xs">
              <Text size="sm">{error}</Text>
              {errorDetails?.hint && (
                <Text size="xs" c="dimmed">
                  {errorDetails.hint}
                </Text>
              )}
              {errorDetails?.sampleErrors && errorDetails.sampleErrors.length > 0 && (
                <Stack gap={2}>
                  <Text size="xs" fw={600} mt="xs">
                    Sample failures:
                  </Text>
                  <List size="xs" spacing={2}>
                    {errorDetails.sampleErrors.map((e) => (
                      <List.Item key={e.symbol}>
                        <Code>{e.symbol}</Code> — {e.error}
                      </List.Item>
                    ))}
                  </List>
                </Stack>
              )}
            </Stack>
          </Alert>
        )}

        {droppedSymbols.length > 0 && (
          <Alert
            color="yellow"
            icon={<IconAlertCircle />}
            title={`${droppedSymbols.length} stock${droppedSymbols.length === 1 ? "" : "s"} could not be fetched`}
          >
            <Text size="xs" c="dimmed">
              These tickers were skipped after one retry — Claude did not see
              them: <Code>{droppedSymbols.join(", ")}</Code>
            </Text>
          </Alert>
        )}

        {result && debug && result.topBuys.length + result.topSells.length === 0 && (
          <Alert color="yellow" icon={<IconAlertCircle />} title="Claude returned 0 picks">
            <Stack gap="xs">
              <Text size="sm">
                Pre-filter Claude returned <b>{debug.preFilterBuys}</b> buys and{" "}
                <b>{debug.preFilterSells}</b> sells. The macro note below explains the
                reasoning. Try lowering R:R or switching to Loose strictness.
              </Text>
            </Stack>
          </Alert>
        )}

        {debug && (
          <Accordion variant="separated" radius="md">
            <Accordion.Item value="debug">
              <Accordion.Control>
                <Text size="sm" fw={500}>
                  Raw Claude response (debug)
                </Text>
              </Accordion.Control>
              <Accordion.Panel>
                <Text size="xs" c="dimmed" mb="xs">
                  Pre-filter: {debug.preFilterBuys} buys / {debug.preFilterSells} sells.
                  Post-filter applies your conviction floor and max-picks cap.
                </Text>
                <Code block style={{ maxHeight: 400, overflow: "auto", fontSize: 11 }}>
                  {debug.rawResponse}
                </Code>
              </Accordion.Panel>
            </Accordion.Item>
          </Accordion>
        )}

        {result ? (
          <ScreenerResults
            result={result}
            direction={direction}
            currency={currency}
          />
        ) : (
          !running && (
            <Card withBorder padding="lg" radius="md">
              <Text c="dimmed">
                No screen yet for {market}. Tune parameters above if you want,
                then hit <b>Run Screen</b>. Results are saved automatically.
              </Text>
            </Card>
          )
        )}
      </Stack>
    </Container>
  );
}
