import { useParams } from "react-router-dom";

const useChatId = () => {
  const params = useParams();
  const chatId = params.chatId || null;
  return chatId;
};

export default useChatId;
