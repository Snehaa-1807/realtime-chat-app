import { z } from "zod";
import { useRef, useState, useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { toast } from "sonner";
import { Button } from "../ui/button";
import { Paperclip, Send, X, Smile } from "lucide-react";
import { Form, FormField, FormItem } from "../ui/form";
import { Input } from "../ui/input";
import ChatReplyBar from "./chat-reply-bar";
import { useChat } from "@/hooks/use-chat";
import EmojiInputPicker from "./emoji-input-picker";

const messageSchema = z.object({ message: z.string().optional() });

const ChatFooter = ({ chatId, currentUserId, replyTo, onCancelReply }) => {
  const { sendMessage, isSendingMsg, startTyping, stopTyping } = useChat();
  const [image, setImage] = useState(null);
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);
  const imageInputRef = useRef(null);
  const typingTimeoutRef = useRef(null);
  const inputRef = useRef(null);

  const form = useForm({
    resolver: zodResolver(messageSchema),
    defaultValues: { message: "" },
  });

  useEffect(() => {
    return () => {
      if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current);
      if (chatId) stopTyping(chatId);
    };
  }, [chatId]);

  const handleTyping = () => {
    if (!chatId) return;
    startTyping(chatId);
    if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current);
    typingTimeoutRef.current = setTimeout(() => stopTyping(chatId), 2000);
  };

  const handleEmojiSelect = (emoji) => {
    const current = form.getValues("message") || "";
    form.setValue("message", current + emoji);
    inputRef.current?.focus();
  };

  const handleImageChange = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!file.type.startsWith("image/")) { toast.error("Please select an image file"); return; }
    const reader = new FileReader();
    reader.onloadend = () => setImage(reader.result);
    reader.readAsDataURL(file);
  };

  const handleRemoveImage = () => {
    setImage(null);
    if (imageInputRef.current) imageInputRef.current.value = "";
  };

  const onSubmit = (values) => {
    if (isSendingMsg) return;
    if (!values.message?.trim() && !image) { toast.error("Please enter a message or select an image"); return; }
    stopTyping(chatId);
    if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current);
    setShowEmojiPicker(false);
    sendMessage({ chatId, content: values.message, image: image || undefined, replyTo });
    onCancelReply();
    handleRemoveImage();
    form.reset();
  };

  return (
    <>
      <div className="sticky bottom-0 inset-x-0 z-[999] bg-card border-t border-border py-4">
        {image && !isSendingMsg && (
          <div className="max-w-6xl mx-auto px-8.5 mb-2">
            <div className="relative w-fit">
              <img src={image} className="object-contain h-16 bg-muted min-w-16 rounded" />
              <Button type="button" variant="ghost" size="icon"
                className="absolute top-px right-1 bg-black/50 text-white rounded-full cursor-pointer !size-6"
                onClick={handleRemoveImage}>
                <X className="h-3 w-3" />
              </Button>
            </div>
          </div>
        )}

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)}
            className="max-w-6xl px-4 mx-auto flex items-end gap-2 relative">

            {/* Emoji picker */}
            {showEmojiPicker && (
              <EmojiInputPicker
                onSelect={handleEmojiSelect}
                onClose={() => setShowEmojiPicker(false)}
              />
            )}

            <div className="flex items-center gap-1">
              {/* Emoji button */}
              <Button type="button" variant="outline" size="icon"
                className="rounded-full"
                onClick={() => setShowEmojiPicker((v) => !v)}>
                <Smile className="h-4 w-4" />
              </Button>

              {/* Image button */}
              <Button type="button" variant="outline" size="icon"
                disabled={isSendingMsg} className="rounded-full"
                onClick={() => imageInputRef.current?.click()}>
                <Paperclip className="h-4 w-4" />
              </Button>
              <input type="file" className="hidden" accept="image/*"
                disabled={isSendingMsg} ref={imageInputRef} onChange={handleImageChange} />
            </div>

            <FormField control={form.control} name="message" disabled={isSendingMsg}
              render={({ field }) => (
                <FormItem className="flex-1">
                  <Input
                    {...field}
                    ref={inputRef}
                    autoComplete="off"
                    placeholder="Type a message"
                    className="min-h-[40px] bg-background"
                    onFocus={() => setShowEmojiPicker(false)}
                    onChange={(e) => { field.onChange(e); handleTyping(); }}
                  />
                </FormItem>
              )}
            />

            <Button type="submit" size="icon" className="rounded-full" disabled={isSendingMsg}>
              <Send className="h-3.5 w-3.5" />
            </Button>
          </form>
        </Form>
      </div>

      {replyTo && !isSendingMsg && (
        <ChatReplyBar replyTo={replyTo} currentUserId={currentUserId} onCancel={onCancelReply} />
      )}
    </>
  );
};

export default ChatFooter;