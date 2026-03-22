import { useState, useRef } from "react";
import { useAuth } from "@/hooks/use-auth";
import { useProfile } from "@/hooks/use-profile";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Spinner } from "@/components/ui/spinner";
import { Camera, KeyRound, Trash2, X, User, Mail, Calendar } from "lucide-react";
import { cn } from "@/lib/utils";
import { format } from "date-fns";

const TAB_PROFILE = "profile";
const TAB_PASSWORD = "password";
const TAB_DANGER = "danger";

const AccountModal = ({ onClose }) => {
  const { user, logout } = useAuth();
  const { updateProfile, isUpdating, changePassword, isChangingPassword, deleteAccount, isDeletingAccount } = useProfile();

  const [activeTab, setActiveTab] = useState(TAB_PROFILE);

  // Profile tab state
  const [name, setName] = useState(user?.name || "");
  const [avatarPreview, setAvatarPreview] = useState(user?.avatar || "");
  const [avatarBase64, setAvatarBase64] = useState(null);
  const [removeAvatar, setRemoveAvatar] = useState(false);
  const avatarInputRef = useRef(null);

  // Password tab state
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");

  // Danger tab state
  const [deletePassword, setDeletePassword] = useState("");
  const [deleteConfirm, setDeleteConfirm] = useState("");

  const handleAvatarChange = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!file.type.startsWith("image/")) return;
    const reader = new FileReader();
    reader.onloadend = () => {
      setAvatarPreview(reader.result);
      setAvatarBase64(reader.result);
      setRemoveAvatar(false);
    };
    reader.readAsDataURL(file);
  };

  const handleRemoveAvatar = () => {
    setAvatarPreview("");
    setAvatarBase64(null);
    setRemoveAvatar(true);
    if (avatarInputRef.current) avatarInputRef.current.value = "";
  };

  const handleUpdateProfile = async () => {
    const payload = {};
    if (name.trim() && name !== user?.name) payload.name = name.trim();
    if (avatarBase64) payload.avatar = avatarBase64;
    if (removeAvatar) payload.avatar = "";  // empty string = remove avatar
    if (!payload.name && !payload.avatar && !removeAvatar) return;
    const success = await updateProfile(payload);
    if (success) {
      setAvatarBase64(null);
      setRemoveAvatar(false);
    }
  };

  const handleChangePassword = async () => {
    if (!currentPassword || !newPassword || !confirmPassword) return;
    if (newPassword !== confirmPassword) {
      return;
    }
    const success = await changePassword({ currentPassword, newPassword });
    if (success) {
      setCurrentPassword("");
      setNewPassword("");
      setConfirmPassword("");
    }
  };

  const handleDeleteAccount = async () => {
    if (deleteConfirm !== "DELETE") return;
    const success = await deleteAccount(deletePassword);
    if (success) {
      logout();
      onClose();
    }
  };

  const tabs = [
    { id: TAB_PROFILE, label: "Profile", icon: User },
    { id: TAB_PASSWORD, label: "Password", icon: KeyRound },
    { id: TAB_DANGER, label: "Danger Zone", icon: Trash2 },
  ];

  return (
    <div className="fixed inset-0 z-[99999] flex items-center justify-center bg-black/50 backdrop-blur-sm">
      <div className="bg-card w-full max-w-lg mx-4 rounded-2xl shadow-2xl border border-border overflow-hidden">

        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-border">
          <h2 className="text-lg font-semibold">My Account</h2>
          <Button variant="ghost" size="icon" onClick={onClose} className="rounded-full">
            <X size={18} />
          </Button>
        </div>

        {/* Tabs */}
        <div className="flex border-b border-border">
          {tabs.map((tab) => {
            const Icon = tab.icon;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={cn(
                  "flex-1 flex items-center justify-center gap-2 py-3 text-sm font-medium transition-colors",
                  activeTab === tab.id
                    ? "border-b-2 border-primary text-primary"
                    : "text-muted-foreground hover:text-foreground",
                  tab.id === TAB_DANGER && activeTab === TAB_DANGER && "border-destructive text-destructive"
                )}
              >
                <Icon size={15} />
                <span className="hidden sm:inline">{tab.label}</span>
              </button>
            );
          })}
        </div>

        {/* Content */}
        <div className="p-6 space-y-5">

          {/* ── Profile Tab ── */}
          {activeTab === TAB_PROFILE && (
            <div className="space-y-5">
              {/* Avatar */}
              <div className="flex flex-col items-center gap-3">
                <div className="relative">
                  <Avatar className="w-20 h-20">
                    <AvatarImage src={avatarPreview} />
                    <AvatarFallback className="text-2xl font-semibold bg-primary/10 text-primary">
                      {user?.name?.charAt(0)}
                    </AvatarFallback>
                  </Avatar>

                  {/* Change photo button */}
                  <button
                    onClick={() => avatarInputRef.current?.click()}
                    className="absolute bottom-0 right-0 bg-primary text-white rounded-full p-1.5 shadow-md hover:bg-primary/90 transition-colors"
                    title="Change photo"
                  >
                    <Camera size={13} />
                  </button>

                  {/* Remove photo button — only shown if avatar exists */}
                  {avatarPreview && (
                    <button
                      onClick={handleRemoveAvatar}
                      className="absolute top-0 right-0 bg-destructive text-white rounded-full p-1 shadow-md hover:bg-destructive/90 transition-colors"
                      title="Remove photo"
                    >
                      <X size={11} />
                    </button>
                  )}

                  <input
                    ref={avatarInputRef}
                    type="file"
                    accept="image/*"
                    className="hidden"
                    onChange={handleAvatarChange}
                  />
                </div>
                <p className="text-xs text-muted-foreground">
                  {avatarPreview
                    ? "Click ✕ to remove · Click 📷 to change"
                    : "Click 📷 to upload a photo"}
                </p>
              </div>

              {/* Account Info */}
              <div className="bg-muted/40 rounded-lg p-4 space-y-3 text-sm">
                <div className="flex items-center gap-3">
                  <Mail size={15} className="text-muted-foreground shrink-0" />
                  <div>
                    <p className="text-xs text-muted-foreground">Email</p>
                    <p className="font-medium">{user?.email}</p>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <Calendar size={15} className="text-muted-foreground shrink-0" />
                  <div>
                    <p className="text-xs text-muted-foreground">Joined</p>
                    <p className="font-medium">
                      {user?.createdAt ? format(new Date(user.createdAt), "MMMM d, yyyy") : "—"}
                    </p>
                  </div>
                </div>
              </div>

              {/* Name */}
              <div className="space-y-1.5">
                <label className="text-sm font-medium">Display Name</label>
                <Input
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="Your name"
                />
              </div>

              <Button
                className="w-full"
                onClick={handleUpdateProfile}
                disabled={isUpdating || (!avatarBase64 && !removeAvatar && name === user?.name)}
              >
                {isUpdating && <Spinner className="w-4 h-4" />}
                Save Changes
              </Button>
            </div>
          )}

          {/* ── Password Tab ── */}
          {activeTab === TAB_PASSWORD && (
            <div className="space-y-4">
              <div className="space-y-1.5">
                <label className="text-sm font-medium">Current Password</label>
                <Input
                  type="password"
                  placeholder="Enter current password"
                  value={currentPassword}
                  onChange={(e) => setCurrentPassword(e.target.value)}
                />
              </div>
              <div className="space-y-1.5">
                <label className="text-sm font-medium">New Password</label>
                <Input
                  type="password"
                  placeholder="At least 6 characters"
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                />
              </div>
              <div className="space-y-1.5">
                <label className="text-sm font-medium">Confirm New Password</label>
                <Input
                  type="password"
                  placeholder="Repeat new password"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                />
                {confirmPassword && newPassword !== confirmPassword && (
                  <p className="text-xs text-destructive">Passwords do not match</p>
                )}
              </div>
              <Button
                className="w-full"
                onClick={handleChangePassword}
                disabled={
                  isChangingPassword ||
                  !currentPassword ||
                  !newPassword ||
                  !confirmPassword ||
                  newPassword !== confirmPassword
                }
              >
                {isChangingPassword && <Spinner className="w-4 h-4" />}
                Change Password
              </Button>
            </div>
          )}

          {/* ── Danger Zone Tab ── */}
          {activeTab === TAB_DANGER && (
            <div className="space-y-4">
              <div className="bg-destructive/10 border border-destructive/30 rounded-lg p-4 text-sm text-destructive">
                ⚠️ This action is permanent and cannot be undone. All your chats and messages will be deleted.
              </div>

              <div className="space-y-1.5">
                <label className="text-sm font-medium">Your Password</label>
                <Input
                  type="password"
                  placeholder="Enter your password to confirm"
                  value={deletePassword}
                  onChange={(e) => setDeletePassword(e.target.value)}
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-sm font-medium">
                  Type <span className="font-mono font-bold text-destructive">DELETE</span> to confirm
                </label>
                <Input
                  placeholder="DELETE"
                  value={deleteConfirm}
                  onChange={(e) => setDeleteConfirm(e.target.value)}
                />
              </div>

              <Button
                variant="destructive"
                className="w-full"
                onClick={handleDeleteAccount}
                disabled={
                  isDeletingAccount ||
                  !deletePassword ||
                  deleteConfirm !== "DELETE"
                }
              >
                {isDeletingAccount && <Spinner className="w-4 h-4" />}
                Delete My Account
              </Button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default AccountModal;