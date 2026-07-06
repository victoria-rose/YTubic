import { useEffect, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { invoke } from "@tauri-apps/api/core";
import { listen } from "@tauri-apps/api/event";
import {
  BellIcon,
  Loader2Icon,
  LogInIcon,
  LogOutIcon,
  RocketIcon,
  UserRoundIcon,
  UsersRoundIcon,
  XIcon,
} from "lucide-react";
import { toast } from "sonner";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Group, SettingRow, TabPane } from "@/components/settings/primitives";
import { fetchAccountInfo } from "@/lib/innertube/account";
import { resetInnertube } from "@/lib/innertube/client";
import { removeAccount, useAccounts } from "@/lib/store/accounts";
import { openChannelPicker } from "@/lib/store/channel-picker";
import { useSettingsStore } from "@/lib/store/settings";

export function GeneralTab() {
  return (
    <TabPane tightTop>
      <AccountGroup />
      <BehaviorGroup />
    </TabPane>
  );
}

/* ------------------------------------------------------------------ */
/* Account                                                             */
/* ------------------------------------------------------------------ */

function AccountGroup() {
  const [signingIn, setSigningIn] = useState(false);
  const loggedIn = useQuery({
    queryKey: ["auth-logged-in"],
    queryFn: () => invoke<boolean>("is_logged_in"),
    staleTime: 30_000,
  });
  const accounts = useAccounts();
  const active = accounts.data?.find((a) => a.isActive);
  // The accounts index often lands before its meta is backfilled, so
  // `active.email` can be empty for the first moment after sign-in.
  // The shared `account-info` query (same one the sidebar uses) reads
  // the live `/account_menu`, giving us the email reliably.
  const account = useQuery({
    queryKey: ["account-info"],
    queryFn: () => fetchAccountInfo(),
    enabled: !!loggedIn.data,
    staleTime: 5 * 60_000,
    retry: false,
  });
  const email = account.data?.email || active?.email || "";
  const name = active?.name || account.data?.name || "";
  const photoUrl = active?.photoUrl || account.data?.photoUrl || null;

  useEffect(() => {
    // This tab owns the in-flight spinner + the toast feedback for
    // sign-in started here. Query invalidation + InnerTube client
    // reset live in the global `useLoginSuccessListener` so they fire
    // regardless of where the sign-in was initiated (here or from the
    // sidebar dropdown).
    const unlistenSuccess = listen("login-success", () => {
      setSigningIn(false);
      toast.success("Signed in");
    });
    const unlistenCancel = listen("login-cancelled", () => {
      setSigningIn(false);
    });
    return () => {
      unlistenSuccess.then((fn) => fn());
      unlistenCancel.then((fn) => fn());
    };
  }, []);

  const signIn = async () => {
    setSigningIn(true);
    try {
      await invoke("start_login");
    } catch (e) {
      setSigningIn(false);
      toast.error(String(e));
    }
  };

  const logout = async () => {
    try {
      // Per-account sign out: only the currently active account is
      // removed. If the user has other accounts registered, Rust's
      // `remove_account` promotes the next one to active; otherwise we
      // end up signed out entirely. Either way `accounts-changed`
      // fires and the global listener handles the cache reset.
      const activeId = await invoke<string | null>("get_active_account_id");
      if (activeId) {
        await removeAccount(activeId);
      } else {
        // Defensive fallback — no active account but the button was
        // somehow clickable. Nuke everything to leave a clean state.
        await invoke("clear_cookies");
        resetInnertube();
      }
      toast.success("Signed out");
    } catch (e) {
      toast.error(`Logout failed: ${String(e)}`);
    }
  };

  return (
    <Group>
      <div className="flex items-center gap-3 py-4">
        <Avatar className="size-9">
          {photoUrl ? <AvatarImage src={photoUrl} /> : null}
          <AvatarFallback>
            <UserRoundIcon className="size-[18px]" />
          </AvatarFallback>
        </Avatar>
        <div className="flex min-w-0 flex-1 flex-col gap-1">
          {loggedIn.data ? (
            <>
              <span className="truncate text-[15px] font-medium leading-none">
                {name || email || "Google account"}
              </span>
              <span className="truncate text-[13px] text-muted-foreground">
                {email || "Signed in"}
              </span>
            </>
          ) : (
            <>
              <span className="text-[15px] font-medium leading-none">
                Not signed in
              </span>
              <span className="text-[13px] text-muted-foreground">
                Sign in to unlock your library, liked songs, and
                Premium-quality streams. Cookies stay on this machine.
              </span>
            </>
          )}
        </div>
        {loggedIn.data ? (
          <Button variant="outline" size="sm" onClick={logout}>
            <LogOutIcon />
            Sign out
          </Button>
        ) : (
          <Button size="sm" onClick={signIn} disabled={signingIn}>
            {signingIn ? (
              <Loader2Icon className="animate-spin" />
            ) : (
              <LogInIcon />
            )}
            Sign in with Google
          </Button>
        )}
      </div>
      {loggedIn.data ? (
        <SettingRow
          icon={UsersRoundIcon}
          title="YouTube channel"
          description={
            active?.channelName
              ? `Acting as ${active.channelName}. Library and likes are scoped to this channel.`
              : "Library and likes are scoped to a channel, not the whole Google account. Pick which of your channels YTubic uses."
          }
          control={
            <Button
              variant="outline"
              size="sm"
              onClick={() => openChannelPicker()}
            >
              Switch channel
            </Button>
          }
        />
      ) : null}
    </Group>
  );
}

/* ------------------------------------------------------------------ */
/* Behavior                                                            */
/* ------------------------------------------------------------------ */

function BehaviorGroup() {
  const closeAction = useSettingsStore((s) => s.closeAction);
  const setCloseAction = useSettingsStore((s) => s.setCloseAction);
  const playbackNotifications = useSettingsStore(
    (s) => s.playbackNotifications,
  );
  const setPlaybackNotifications = useSettingsStore(
    (s) => s.setPlaybackNotifications,
  );

  const qc = useQueryClient();
  const autostart = useQuery({
    queryKey: ["autostart"],
    queryFn: () => invoke<boolean>("autostart_is_enabled"),
    staleTime: 60_000,
    retry: false,
  });

  const toggleAutostart = async (enabled: boolean) => {
    try {
      await invoke("autostart_set", { enabled });
    } catch (e) {
      toast.error(String(e));
    }
    // Re-read the OS registration either way — it's the source of
    // truth, and the failed path needs the switch snapped back.
    await qc.invalidateQueries({ queryKey: ["autostart"] });
  };

  return (
    <Group>
      <SettingRow
        icon={RocketIcon}
        title="Launch at startup"
        description="Start YTubic automatically when you log in."
        control={
          <Switch
            checked={!!autostart.data}
            onCheckedChange={(v) => void toggleAutostart(v)}
            disabled={autostart.isLoading}
            aria-label="Launch at startup"
          />
        }
      />
      <SettingRow
        icon={BellIcon}
        title="Playback notifications"
        description="Show a system notification when the track changes in the background."
        control={
          <Switch
            checked={playbackNotifications}
            onCheckedChange={setPlaybackNotifications}
            aria-label="Playback notifications"
          />
        }
      />
      <SettingRow
        icon={XIcon}
        title="Close to tray"
        description="Hide YTubic to the tray when you press ✕ instead of quitting."
        control={
          <Switch
            checked={closeAction === "tray"}
            onCheckedChange={(v) => setCloseAction(v ? "tray" : "quit")}
            aria-label="Close to tray"
          />
        }
      />
    </Group>
  );
}
