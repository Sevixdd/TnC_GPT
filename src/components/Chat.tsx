"use client";
import Message from "@/components/Message";
import { useAuth } from "@/context/AuthContext";
import { db } from "@/lib/firebase";
import { MessageAuthor } from "@/types/enums";
import { addDoc, arrayUnion, collection, doc, getDoc, serverTimestamp, setDoc, updateDoc } from "firebase/firestore";
import { useEffect, useRef, useState } from "react";
import { useQuery } from "react-query";
import SendIcon from "./icons/SendIcon";
import useFocus from '@/hooks/useFocus';
import { useRouter, usePathname } from "next/navigation";


const replies = [
  "As I see it, yes",
  "It is certain",
  "It is decidedly so",
  "Most likely",
  "Outlook good",
  "Signs point to yes",
  "Without a doubt",
  "Yes",
  "Yes - definitely",
  "You may rely on it",
  "Reply hazy, try again",
  "Ask again later",
  "Better not tell you now",
  "Cannot predict now",
  "Concentrate and ask again",
  "Don't count on it",
  "My reply is no",
  "My sources say no",
  "Outlook not so good",
  "Very doubtful",
];

enum ModeEnum {standard="standard",summary="summarise"}

export default function Chat({
  chatId,
}: {
  chatId?: any
}) {
  const [messages, setMessages] = useState<Array<Message>>([]);
  const [loading, setLoading] = useState<boolean>(false);
  const [chatRef, setChatRefFocus] = useFocus();
  const {state} = useAuth();
  const inputRef = useRef<HTMLInputElement>(null);
  const [mode, setMode] = useState<ModeEnum>(ModeEnum.standard);
  const router = useRouter();
  const path = usePathname();

  const handleMessage = async (e: any) => {
    e.preventDefault();
    if (!inputRef?.current?.value) return;
    const message: Message = {
      author: MessageAuthor.user,
      content: inputRef?.current.value,
      timestamp: new Date(),

    };
    if (chatId){
      await updateDoc(doc(db, "chatHistory", chatId), {
        messages: arrayUnion(message),
    });
    } else {
       await addDoc(collection(db, "chatHistory"), {
        messages: [message],
        userId: state.user?.uid,

      }).then((res)=>{chatId=res.id});
      
    }
    setMessages((prev) => [...prev, message]);
    inputRef.current.value = "";
    return setTimeout(handleResponse, 100);
  };

  const handleResponse = async () => {
    setLoading(true);
    const response: Message = {
      author: MessageAuthor.bot,
      content: replies[Math.floor(Math.random() * replies.length)],
      timestamp: new Date(),
    };
    await updateDoc(doc(db, "chatHistory", chatId), {
      messages: arrayUnion(response),
    });
    response.slow = true
    setMessages((prev) => [...prev, response]);
    setLoading(false);
    if (path == "/") {
      router.replace(`/chat/${chatId}`)
    }
  };

  useEffect(() => {
    async function getDataOrCreate() {
      if (!chatId) return;
      const docRef = doc(db, "chatHistory", chatId);

      const docSnap = await getDoc(docRef);
      if (docSnap.exists()) {
        setMessages(docSnap.data()?.messages);
      } else {
        const res = await addDoc(collection(db, "chatHistory"), {
          messages: [],
          userId: state.user?.uid,
        });
        router.push(`/chat/${res.id}`);
      }
    }
    getDataOrCreate();
  }, [chatId]);

  return (
    <div className="h-full flex flex-col justify-between p-10 pt-5 max-w-full overflow-hidden">
      <div className="flex flex-row rounded-lg w-fit text-sm mb-5 bg-[#2D2D2D] font-semibold">
        <button className={"p-2 h-full rounded-l-md" + (mode == ModeEnum.standard? " transition ease-in duration-250 bg-[#0085FF] text-[#212121]":" transition ease-out duration-250 shadow-inner")} onClick={()=>setMode(ModeEnum.standard)}>Standard</button>
        <button className={"p-2 h-full rounded-r-md" + (mode == ModeEnum.summary ? " transition ease-in duration-250 bg-[#0085FF] text-[#212121]":" transition ease-out duration-250 shadow-inner")} onClick={()=>setMode(ModeEnum.summary)}>Summarise</button>
      </div>
      <div>
        <h1 className="text-4xl font-semibold">TnC Gpt</h1>
      </div>
      <div className="grow space-y-2 py-5 h-0 overflow-scroll scroll-smooth max-w-full ">
        {messages.map((message, i) => (
          <Message key={i} message={message} slow={message.slow} />
        ))}
        {loading && (
          <Message
            message={{ author: MessageAuthor.bot, content: "" }}
            loading
            
          />
        )}
      </div>
      <div
        ref={chatRef}
        className="flex flex-row focus-within:outline focus-within:outline-[0.5px] focus-within::outline-offset-3 focus-within:outline-[#9e9e9e] bg-[#2D2D2D] rounded-lg shadow-md opacity-90 overflow-hidden"
        onKeyDown={(e) => {
          if (e.key === "Enter") {
            handleMessage(e);
          }
        }}
      >
        <input
          ref={inputRef}
          type="text"
          placeholder={mode==ModeEnum.standard?"What do you desire to know?":"Enter link of the Terms and condions"}
          className="bg-inherit h-auto w-full focus:outline-none text-stone-200 py-2 px-4"
          onFocus={(e) => {
            e.preventDefault;
          }}
        />
        <button
          className="bg-[#0085FF] text-white rounded-lg rounded-l-none px-3"
          onClick={handleMessage}
        >
          <SendIcon/>
        </button>
      </div>
    </div>
  );
}
