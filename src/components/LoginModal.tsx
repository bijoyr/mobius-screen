"use client";

import { useState } from "react";
import { signIn } from "next-auth/react";
import {
  Anchor,
  Button,
  Divider,
  Modal,
  PasswordInput,
  Stack,
  Text,
  TextInput,
} from "@mantine/core";
import { IconLogin2 } from "@tabler/icons-react";
import { ContactForm } from "./ContactForm";

export function LoginModal({
  opened,
  onClose,
}: {
  opened: boolean;
  onClose: () => void;
}) {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [showContact, setShowContact] = useState(false);

  async function handleDemo(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);
    const res = await signIn("demo", { username, password, redirect: false });
    setLoading(false);
    if (res?.ok) {
      onClose();
      window.location.reload();
    } else {
      setError("Invalid username or password.");
    }
  }

  return (
    <Modal opened={opened} onClose={onClose} title="Sign in to Mobius-Screen" centered>
      <Stack gap="md">
        <Text size="sm" c="dimmed">
          Enter your demo credentials, or request access below.
        </Text>

        <form onSubmit={handleDemo}>
          <Stack gap="xs">
            <TextInput
              required
              label="Username"
              placeholder="Username"
              value={username}
              onChange={(e) => setUsername(e.currentTarget.value)}
            />
            <PasswordInput
              required
              label="Password"
              placeholder="Password"
              value={password}
              onChange={(e) => setPassword(e.currentTarget.value)}
            />
            {error && (
              <Text size="xs" c="red">
                {error}
              </Text>
            )}
            <Button
              type="submit"
              fullWidth
              leftSection={<IconLogin2 size={16} />}
              loading={loading}
            >
              Sign in
            </Button>
          </Stack>
        </form>

        <Divider />

        <Anchor
          component="button"
          type="button"
          size="sm"
          onClick={() => setShowContact((v) => !v)}
        >
          {showContact ? "Hide" : "Contact us for login details"}
        </Anchor>
        {showContact && <ContactForm />}
      </Stack>
    </Modal>
  );
}
