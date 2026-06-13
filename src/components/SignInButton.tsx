"use client";

import { useState } from "react";
import { signOut, useSession } from "next-auth/react";
import {
  ActionIcon,
  Avatar,
  Button,
  Loader,
  Menu,
  Text,
} from "@mantine/core";
import { IconLogin2, IconLogout } from "@tabler/icons-react";
import { LoginModal } from "./LoginModal";

export function SignInButton() {
  const { data: session, status } = useSession();
  const [loginOpen, setLoginOpen] = useState(false);

  if (status === "loading") {
    return <Loader size="xs" />;
  }

  if (!session?.user) {
    return (
      <>
        <Button
          size="xs"
          variant="light"
          leftSection={<IconLogin2 size={14} />}
          onClick={() => setLoginOpen(true)}
        >
          Sign in
        </Button>
        <LoginModal opened={loginOpen} onClose={() => setLoginOpen(false)} />
      </>
    );
  }

  const label = session.user.name ?? session.user.email ?? "Account";
  const initial = (session.user.name ?? session.user.email ?? "?")
    .charAt(0)
    .toUpperCase();

  return (
    <Menu shadow="md" width={220} position="bottom-end">
      <Menu.Target>
        <ActionIcon variant="subtle" radius="xl" size="lg" aria-label="Account">
          {session.user.image ? (
            <Avatar src={session.user.image} alt={label} size="sm" radius="xl" />
          ) : (
            <Avatar size="sm" radius="xl" color="blue">
              {initial}
            </Avatar>
          )}
        </ActionIcon>
      </Menu.Target>
      <Menu.Dropdown>
        <Menu.Label>
          <Text size="xs" c="dimmed" truncate>
            {session.user.email ?? label}
          </Text>
        </Menu.Label>
        <Menu.Item
          leftSection={<IconLogout size={14} />}
          onClick={() => signOut()}
        >
          Sign out
        </Menu.Item>
      </Menu.Dropdown>
    </Menu>
  );
}
