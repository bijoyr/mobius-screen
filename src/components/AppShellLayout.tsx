"use client";

import { useEffect, useState } from "react";
import {
  AppShell,
  Burger,
  Group,
  NavLink,
  Title,
  Text,
  ActionIcon,
  useMantineColorScheme,
  useComputedColorScheme,
} from "@mantine/core";
import { useDisclosure } from "@mantine/hooks";
import {
  IconChartLine,
  IconLayoutDashboard,
  IconList,
  IconMoon,
  IconRadar,
  IconSun,
  IconWorld,
} from "@tabler/icons-react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { SignInButton } from "./SignInButton";

const NAV_LINKS = [
  { href: "/", label: "Dashboard", icon: IconLayoutDashboard },
  { href: "/screener", label: "Screener", icon: IconRadar },
  { href: "/intl", label: "Intl. Watchlist", icon: IconWorld },
  { href: "/watchlist", label: "Watchlist", icon: IconList },
];

export function AppShellLayout({ children }: { children: React.ReactNode }) {
  const [opened, { toggle }] = useDisclosure();
  const pathname = usePathname();

  return (
    <AppShell
      header={{ height: 56 }}
      navbar={{ width: 240, breakpoint: "sm", collapsed: { mobile: !opened } }}
      padding="md"
    >
      <AppShell.Header>
        <Group h="100%" px="md" justify="space-between">
          <Group>
            <Burger opened={opened} onClick={toggle} hiddenFrom="sm" size="sm" />
            <Group gap="xs">
              <IconChartLine size={22} />
              <Title order={4}>NSE F&amp;O Screener</Title>
            </Group>
          </Group>
          <Group gap="xs">
            <ThemeToggle />
            <SignInButton />
          </Group>
        </Group>
      </AppShell.Header>

      <AppShell.Navbar p="xs">
        {NAV_LINKS.map((link) => {
          const Icon = link.icon;
          const active =
            link.href === "/"
              ? pathname === "/"
              : pathname.startsWith(link.href);
          return (
            <NavLink
              key={link.href}
              component={Link}
              href={link.href}
              label={link.label}
              leftSection={<Icon size={18} stroke={1.6} />}
              active={active}
              variant="light"
              onClick={() => opened && toggle()}
            />
          );
        })}
        <Text size="xs" c="dimmed" mt="lg" px="sm">
          Personal tool. Not investment advice.
        </Text>
      </AppShell.Navbar>

      <AppShell.Main>{children}</AppShell.Main>
    </AppShell>
  );
}

function ThemeToggle() {
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);
  const { setColorScheme } = useMantineColorScheme();
  const computed = useComputedColorScheme("light", { getInitialValueInEffect: true });
  const next = computed === "dark" ? "light" : "dark";

  return (
    <ActionIcon
      variant="default"
      size="lg"
      aria-label={mounted ? `Switch to ${next} mode` : "Toggle theme"}
      onClick={() => setColorScheme(next)}
      suppressHydrationWarning
    >
      <span suppressHydrationWarning>
        {mounted && computed === "dark" ? (
          <IconSun size={18} />
        ) : (
          <IconMoon size={18} />
        )}
      </span>
    </ActionIcon>
  );
}
