import {
  Badge,
  Card,
  Container,
  Grid,
  GridCol,
  Group,
  Stack,
  Text,
  Title,
} from "@mantine/core";
import {
  IconListDetails,
  IconRadar,
  IconTrendingDown,
  IconTrendingUp,
} from "@tabler/icons-react";
import { getLatestScreen, listWatchlist } from "@/lib/db";
import { listMarkets } from "@/lib/markets";
import { NavButton } from "@/components/NavLinks";
import { auth } from "@/auth";

export const dynamic = "force-dynamic";

export default async function HomePage() {
  const session = await auth();
  const latest = session?.user?.id
    ? await getLatestScreen(session.user.id)
    : null;
  const watchlist = await listWatchlist();
  const markets = await listMarkets();
  const topBuy = latest?.result.topBuys[0] ?? null;
  const topSell = latest?.result.topSells[0] ?? null;

  return (
    <Container size="lg" py="md">
      <Stack gap="lg">
        <Stack gap={2}>
          <Title order={2}>Dashboard</Title>
          <Text c="dimmed" size="sm">
            Personal screener for NSE F&amp;O (India) and ADX + DFM (UAE). Macro-thematic + Elliott Wave, powered by Claude.
          </Text>
        </Stack>

        <Grid>
          <GridCol span={{ base: 12, sm: 6, md: 3 }}>
            <SummaryCard
              label="Tracked stocks"
              value={markets
                .reduce((sum, m) => sum + m.universe.length, 0)
                .toString()}
              hint={markets
                .map((m) => `${m.id}: ${m.universe.length}`)
                .join(" · ")}
            />
          </GridCol>
          <GridCol span={{ base: 12, sm: 6, md: 3 }}>
            <SummaryCard
              label="Watchlist"
              value={watchlist.length.toString()}
              hint={
                watchlist.length === 0
                  ? "empty"
                  : `last add ${new Date(watchlist[0].addedAt).toLocaleDateString()}`
              }
            />
          </GridCol>
          <GridCol span={{ base: 12, sm: 6, md: 3 }}>
            <SummaryCard
              label="Last screen"
              value={
                latest
                  ? new Date(latest.runAt).toLocaleString(undefined, {
                      month: "short",
                      day: "numeric",
                      hour: "2-digit",
                      minute: "2-digit",
                    })
                  : "—"
              }
              hint={latest ? `${latest.result.topBuys.length + latest.result.topSells.length} picks` : "never run"}
            />
          </GridCol>
          <GridCol span={{ base: 12, sm: 6, md: 3 }}>
            <SummaryCard
              label="Top conviction"
              value={
                topBuy
                  ? `${topBuy.symbol}`
                  : "—"
              }
              hint={topBuy ? `Buy · conv ${topBuy.conviction}` : "run a screen"}
            />
          </GridCol>
        </Grid>

        <Group>
          <NavButton
            href="/screener"
            leftSection={<IconRadar size={18} />}
          >
            Run Screener
          </NavButton>
          <NavButton
            href="/watchlist"
            variant="default"
            leftSection={<IconListDetails size={18} />}
          >
            View Watchlist
          </NavButton>
        </Group>

        {latest && (
          <Grid>
            <GridCol
              span={{ base: 12, md: latest.result.topSells.length > 0 ? 6 : 12 }}
            >
              <PickPreview
                title={`Top Buy${latest.result.market ? ` (${latest.result.market})` : ""}`}
                color="green"
                icon={<IconTrendingUp size={20} />}
                pick={topBuy}
              />
            </GridCol>
            {latest.result.topSells.length > 0 && (
              <GridCol span={{ base: 12, md: 6 }}>
                <PickPreview
                  title={`Top Sell${latest.result.market ? ` (${latest.result.market})` : ""}`}
                  color="red"
                  icon={<IconTrendingDown size={20} />}
                  pick={topSell}
                />
              </GridCol>
            )}
          </Grid>
        )}
      </Stack>
    </Container>
  );
}

function SummaryCard({
  label,
  value,
  hint,
}: {
  label: string;
  value: string;
  hint?: string;
}) {
  return (
    <Card withBorder padding="md" radius="md">
      <Text size="xs" c="dimmed" tt="uppercase" fw={600}>
        {label}
      </Text>
      <Text size="xl" fw={700} mt={4}>
        {value}
      </Text>
      {hint && (
        <Text size="xs" c="dimmed" mt={2}>
          {hint}
        </Text>
      )}
    </Card>
  );
}

function PickPreview({
  title,
  color,
  icon,
  pick,
}: {
  title: string;
  color: string;
  icon: React.ReactNode;
  pick:
    | {
        symbol: string;
        thesis: string;
        entry: number;
        target: number;
        stop: number;
        conviction: number;
        dayChangePct?: number;
      }
    | null;
}) {
  if (!pick) {
    return (
      <Card withBorder padding="md" radius="md">
        <Text c="dimmed" size="sm">
          {title}: no pick this run.
        </Text>
      </Card>
    );
  }
  const dc = pick.dayChangePct;
  const dcColor = dc == null ? "dimmed" : dc >= 0 ? "teal.6" : "red.6";
  const dcLabel =
    dc == null ? "—" : `${dc >= 0 ? "+" : ""}${dc.toFixed(1)}%`;
  return (
    <Card withBorder padding="md" radius="md">
      <Group justify="space-between" align="flex-start">
        <Group gap="xs">
          {icon}
          <Title order={5}>{title}</Title>
        </Group>
        <Badge color={color}>conv {pick.conviction}</Badge>
      </Group>
      <Group gap="sm" mt="xs" align="baseline">
        <Text fw={700}>{pick.symbol}</Text>
        <Text size="sm" c={dcColor} fw={600}>
          {dcLabel}
        </Text>
      </Group>
      <Text size="sm" mt={4}>
        {pick.thesis}
      </Text>
      <Group gap="lg" mt="sm">
        <Text size="xs" c="dimmed">
          Entry <b>{pick.entry}</b>
        </Text>
        <Text size="xs" c="dimmed">
          Stop <b>{pick.stop}</b>
        </Text>
        <Text size="xs" c="dimmed">
          Target <b>{pick.target}</b>
        </Text>
      </Group>
    </Card>
  );
}
