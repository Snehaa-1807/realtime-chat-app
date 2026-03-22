import { API } from "@/lib/axios-client";
import { toast } from "sonner";
import { create } from "zustand";
import { useSocket } from "./use-socket";

export const useAuth = create((set) => ({
  user: null,
  isSigningUp: false,
  isLoggingIn: false,
  isAuthStatusLoading: false,

  register: async (data) => {
    set({ isSigningUp: true });
    try {
      const response = await API.post("/auth/register", data);
      set({ user: response.data.user });
      useSocket.getState().connectSocket();
      toast.success("Register successfully");
    } catch (err) {
      toast.error(err.response?.data?.message || "Register failed");
    } finally {
      set({ isSigningUp: false });
    }
  },

  login: async (data) => {
    set({ isLoggingIn: true });
    try {
      const response = await API.post("/auth/login", data);
      set({ user: response.data.user });
      useSocket.getState().connectSocket();
      toast.success("Login successfully");
    } catch (err) {
      toast.error(err.response?.data?.message || "Login failed");
    } finally {
      set({ isLoggingIn: false });
    }
  },

  logout: async () => {
    try {
      await API.post("/auth/logout");
      set({ user: null });
      useSocket.getState().disconnectSocket();
      toast.success("Logout successfully");
    } catch (err) {
      toast.error(err.response?.data?.message || "Logout failed");
    }
  },

  isAuthStatus: async () => {
    set({ isAuthStatusLoading: true });
    try {
      const response = await API.get("/auth/status");
      set({ user: response.data.user });
      useSocket.getState().connectSocket();
    } catch (err) {
      console.log(err);
    } finally {
      set({ isAuthStatusLoading: false });
    }
  },
}));