import { API } from "@/lib/axios-client";
import { toast } from "sonner";
import { create } from "zustand";
import { useAuth } from "./use-auth";

export const useProfile = create((set) => ({
  isUpdating: false,
  isChangingPassword: false,
  isDeletingAccount: false,

  updateProfile: async (data) => {
    set({ isUpdating: true });
    try {
      const response = await API.put("/profile/update", data);
      // Update the user in auth store too
      useAuth.setState({ user: response.data.user });
      toast.success("Profile updated successfully");
      return true;
    } catch (err) {
      toast.error(err.response?.data?.message || "Failed to update profile");
      return false;
    } finally {
      set({ isUpdating: false });
    }
  },

  changePassword: async (data) => {
    set({ isChangingPassword: true });
    try {
      await API.put("/profile/change-password", data);
      toast.success("Password changed successfully");
      return true;
    } catch (err) {
      toast.error(err.response?.data?.message || "Failed to change password");
      return false;
    } finally {
      set({ isChangingPassword: false });
    }
  },

  deleteAccount: async (password) => {
    set({ isDeletingAccount: true });
    try {
      await API.delete("/profile/delete", { data: { password } });
      useAuth.setState({ user: null });
      toast.success("Account deleted successfully");
      return true;
    } catch (err) {
      toast.error(err.response?.data?.message || "Failed to delete account");
      return false;
    } finally {
      set({ isDeletingAccount: false });
    }
  },
}));