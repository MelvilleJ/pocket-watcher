import { useCallback } from "react";
import { Alert } from "react-native";

import { useAuth } from "@/lib/auth-context";

export function useConfirmLogout() {
  const { logout } = useAuth();

  return useCallback(() => {
    Alert.alert("Log out", "Your changes are synced first, then the data on this phone is cleared.", [
      { text: "Cancel", style: "cancel" },
      {
        text: "Log out",
        style: "destructive",
        onPress: async () => {
          const unsynced = await logout();
          if (unsynced === 0) return;
          const changes = `${unsynced} change${unsynced === 1 ? "" : "s"}`;
          Alert.alert(
            "Changes not synced",
            `${changes} couldn't be sent to your server and will be deleted from this phone if you log out now. Stay logged in and sync from Settings when you're back online.`,
            [
              { text: "Stay logged in", style: "cancel" },
              { text: "Delete and log out", style: "destructive", onPress: () => void logout({ discardUnsynced: true }) },
            ]
          );
        },
      },
    ]);
  }, [logout]);
}
