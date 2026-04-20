import React, { useState, useEffect, useRef } from 'react';
import { 
  collection, query, where, onSnapshot, addDoc, serverTimestamp, 
  orderBy, doc, getDocs, updateDoc, setDoc, getDoc, Timestamp
} from 'firebase/firestore';
import { signInWithPopup, GoogleAuthProvider, onAuthStateChanged, User as FirebaseUser } from 'firebase/auth';
import { auth, db } from '../firebase';
import { 
  Search, MoreVertical, MessageSquare, Phone, Video, 
  Paperclip, Smile, Mic, Send, ArrowLeft, User, CheckCheck, LogIn
} from 'lucide-react';
import { format } from 'date-fns';
import { cn } from '../lib/utils';
import VideoCallModal from './VideoCallModal';
import { useAppContext } from '../contexts/AppContext';

interface ChatUser {
  uid: string;
  displayName: string;
  email: string;
  photoURL?: string;
}

interface Chat {
  id: string;
  participants: string[];
  lastMessage?: string;
  updatedAt: Timestamp;
  otherUser?: ChatUser;
}

interface Message {
  id: string;
  senderId: string;
  text: string;
  timestamp: Timestamp | null;
  read?: boolean;
}

export default function WhatsAppView() {
  const { setIsAuthModalOpen } = useAppContext();
  const [currentUser, setCurrentUser] = useState<FirebaseUser | null>(null);
  const [chats, setChats] = useState<Chat[]>([]);
  const [activeChat, setActiveChat] = useState<Chat | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [newChatEmail, setNewChatEmail] = useState('');
  const [isCreatingChat, setIsCreatingChat] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const [isVideoCallOpen, setIsVideoCallOpen] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Auth Listener
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      setCurrentUser(user);
      if (user) {
        // Ensure user profile exists in Firestore
        const userRef = doc(db, 'users', user.uid);
        const userSnap = await getDoc(userRef);
        if (!userSnap.exists()) {
          await setDoc(userRef, {
            uid: user.uid,
            email: user.email,
            displayName: user.displayName || 'User',
            photoURL: user.photoURL || '',
            isOnline: true,
            lastSeen: serverTimestamp()
          });
        }
      }
    });
    return () => unsubscribe();
  }, []);

  // Fetch Chats
  useEffect(() => {
    if (!currentUser) return;

    const q = query(
      collection(db, 'chats'),
      where('participants', 'array-contains', currentUser.uid),
      orderBy('updatedAt', 'desc')
    );

    const unsubscribe = onSnapshot(q, async (snapshot) => {
      const chatList: Chat[] = [];
      for (const docSnap of snapshot.docs) {
        const data = docSnap.data();
        const otherUserId = data.participants.find((id: string) => id !== currentUser.uid);
        
        let otherUser: ChatUser | undefined;
        if (otherUserId) {
          const userSnap = await getDoc(doc(db, 'users', otherUserId));
          if (userSnap.exists()) {
            otherUser = userSnap.data() as ChatUser;
          }
        }

        chatList.push({
          id: docSnap.id,
          participants: data.participants,
          lastMessage: data.lastMessage,
          updatedAt: data.updatedAt,
          otherUser
        });
      }
      setChats(chatList);
    });

    return () => unsubscribe();
  }, [currentUser]);

  // Fetch Messages for Active Chat
  useEffect(() => {
    if (!activeChat) return;

    const q = query(
      collection(db, `chats/${activeChat.id}/messages`),
      orderBy('timestamp', 'asc')
    );

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const msgs: Message[] = [];
      snapshot.forEach((doc) => {
        msgs.push({ id: doc.id, ...doc.data() } as Message);
      });
      setMessages(msgs);
      setTimeout(() => {
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
      }, 100);
    });

    return () => unsubscribe();
  }, [activeChat]);

  const handleLogin = () => {
    setIsAuthModalOpen(true);
  };

  const handleCreateChat = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg('');
    if (!newChatEmail.trim() || !currentUser) return;

    try {
      // Find user by email
      const usersRef = collection(db, 'users');
      const q = query(usersRef, where('email', '==', newChatEmail.trim()));
      const querySnapshot = await getDocs(q);

      if (querySnapshot.empty) {
        setErrorMsg("User not found with that email.");
        return;
      }

      const otherUser = querySnapshot.docs[0].data() as ChatUser;

      if (otherUser.uid === currentUser.uid) {
        setErrorMsg("You cannot chat with yourself.");
        return;
      }

      // Check if chat already exists
      const existingChat = chats.find(c => c.participants.includes(otherUser.uid));
      if (existingChat) {
        setActiveChat(existingChat);
        setIsCreatingChat(false);
        setNewChatEmail('');
        return;
      }

      // Create new chat
      const chatRef = await addDoc(collection(db, 'chats'), {
        participants: [currentUser.uid, otherUser.uid],
        updatedAt: serverTimestamp()
      });

      setActiveChat({
        id: chatRef.id,
        participants: [currentUser.uid, otherUser.uid],
        updatedAt: Timestamp.now(),
        otherUser
      });
      setIsCreatingChat(false);
      setNewChatEmail('');

    } catch (error) {
      console.error("Error creating chat:", error);
      setErrorMsg("Failed to create chat.");
    }
  };

  const handleSendMessage = async () => {
    if (!input.trim() || !activeChat || !currentUser) return;

    const text = input.trim();
    setInput('');

    try {
      await addDoc(collection(db, `chats/${activeChat.id}/messages`), {
        senderId: currentUser.uid,
        text,
        timestamp: serverTimestamp(),
        read: false
      });

      await updateDoc(doc(db, 'chats', activeChat.id), {
        lastMessage: text,
        updatedAt: serverTimestamp()
      });
    } catch (error) {
      console.error("Error sending message:", error);
    }
  };

  const formatTime = (timestamp: Timestamp | null) => {
    if (!timestamp) return '';
    return format(timestamp.toDate(), 'HH:mm');
  };

  if (!currentUser) {
    return (
      <div className="h-full flex flex-col items-center justify-center bg-[#efeae2] p-8">
        <div className="bg-white p-8 rounded-2xl shadow-sm text-center max-w-md w-full">
          <div className="w-16 h-16 bg-[#25D366]/10 rounded-full flex items-center justify-center mx-auto mb-6">
            <MessageSquare className="w-8 h-8 text-[#25D366]" />
          </div>
          <h2 className="text-2xl font-semibold text-slate-900 mb-2">WhatsApp Mode</h2>
          <p className="text-slate-500 mb-8">Sign in to chat with other students in real-time.</p>
          <button
            onClick={handleLogin}
            className="w-full flex items-center justify-center gap-2 bg-[#25D366] text-white py-3 px-4 rounded-xl font-medium hover:bg-[#128C7E] transition-colors"
          >
            <LogIn className="w-5 h-5" />
            Sign in with Google
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="h-full flex bg-[#f0f2f5] overflow-hidden">
      {/* Sidebar - Chat List */}
      <div className={cn(
        "w-full md:w-[350px] lg:w-[400px] flex-shrink-0 border-r border-[#d1d7db] bg-white flex flex-col",
        activeChat ? "hidden md:flex" : "flex"
      )}>
        {/* Sidebar Header */}
        <div className="h-16 bg-[#f0f2f5] px-4 flex items-center justify-between shrink-0">
          <div className="w-10 h-10 rounded-full overflow-hidden bg-slate-200">
            {currentUser.photoURL ? (
              <img src={currentUser.photoURL} alt="Profile" className="w-full h-full object-cover" referrerPolicy="no-referrer" />
            ) : (
              <User className="w-full h-full p-2 text-slate-500" />
            )}
          </div>
          <div className="flex items-center gap-4 text-[#54656f]">
            <button onClick={() => { setIsCreatingChat(!isCreatingChat); setErrorMsg(''); }}>
              <MessageSquare className="w-5 h-5" />
            </button>
            <MoreVertical className="w-5 h-5" />
          </div>
        </div>

        {/* Search / New Chat */}
        <div className="p-2 bg-white border-b border-[#f0f2f5]">
          {isCreatingChat ? (
            <div className="flex flex-col gap-2">
              <form onSubmit={handleCreateChat} className="flex gap-2">
                <input
                  type="email"
                  value={newChatEmail}
                  onChange={(e) => setNewChatEmail(e.target.value)}
                  placeholder="Enter user email..."
                  className="flex-1 bg-[#f0f2f5] rounded-lg px-4 py-2 text-sm focus:outline-none"
                  autoFocus
                />
                <button type="submit" className="bg-[#00a884] text-white px-3 rounded-lg text-sm font-medium">
                  Chat
                </button>
              </form>
              {errorMsg && <p className="text-red-500 text-xs px-1">{errorMsg}</p>}
            </div>
          ) : (
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                <Search className="h-4 w-4 text-[#54656f]" />
              </div>
              <input
                type="text"
                placeholder="Search or start new chat"
                className="w-full bg-[#f0f2f5] rounded-lg pl-10 pr-4 py-2 text-sm focus:outline-none"
              />
            </div>
          )}
        </div>

        {/* Chat List */}
        <div className="flex-1 overflow-y-auto">
          {chats.length === 0 && !isCreatingChat ? (
            <div className="p-8 text-center text-[#54656f]">
              <p className="text-sm">No chats yet. Click the message icon above to start a new chat with an email.</p>
            </div>
          ) : (
            chats.map((chat) => (
              <div
                key={chat.id}
                onClick={() => setActiveChat(chat)}
                className={cn(
                  "flex items-center px-3 py-3 cursor-pointer hover:bg-[#f5f6f6] transition-colors",
                  activeChat?.id === chat.id && "bg-[#f0f2f5]"
                )}
              >
                <div className="w-12 h-12 rounded-full overflow-hidden bg-slate-200 shrink-0 mr-3">
                  {chat.otherUser?.photoURL ? (
                    <img src={chat.otherUser.photoURL} alt="Profile" className="w-full h-full object-cover" referrerPolicy="no-referrer" />
                  ) : (
                    <User className="w-full h-full p-2.5 text-slate-500" />
                  )}
                </div>
                <div className="flex-1 min-w-0 border-b border-[#f0f2f5] pb-3">
                  <div className="flex justify-between items-baseline mb-0.5">
                    <h3 className="text-[17px] text-[#111b21] truncate">
                      {chat.otherUser?.displayName || chat.otherUser?.email || 'Unknown User'}
                    </h3>
                    <span className="text-xs text-[#667781] shrink-0 ml-2">
                      {chat.updatedAt ? formatTime(chat.updatedAt) : ''}
                    </span>
                  </div>
                  <p className="text-sm text-[#667781] truncate">
                    {chat.lastMessage || 'No messages yet'}
                  </p>
                </div>
              </div>
            ))
          )}
        </div>
      </div>

      {/* Main Chat Area */}
      <div className={cn(
        "flex-1 flex flex-col bg-[#efeae2] relative",
        !activeChat ? "hidden md:flex" : "flex"
      )} style={{ backgroundImage: 'url("https://user-images.githubusercontent.com/15075759/28719144-86dc0f70-73b1-11e7-911d-60d70fcded21.png")', backgroundRepeat: 'repeat', backgroundSize: '400px' }}>
        
        {!activeChat ? (
          <div className="flex-1 flex flex-col items-center justify-center text-center p-8 bg-[#f0f2f5] z-10">
            <div className="w-80 h-80 bg-slate-200 rounded-full mb-8 opacity-20 flex items-center justify-center">
              <MessageSquare className="w-32 h-32 text-slate-500" />
            </div>
            <h2 className="text-3xl font-light text-[#41525d] mb-4">WhatsApp for Web</h2>
            <p className="text-[#667781] text-sm max-w-md">
              Send and receive messages with your study buddies.
            </p>
          </div>
        ) : (
          <>
            {/* Chat Header */}
            <div className="h-16 bg-[#f0f2f5] px-4 flex items-center justify-between shrink-0 z-10">
              <div className="flex items-center gap-3">
                <button className="md:hidden text-[#54656f]" onClick={() => setActiveChat(null)}>
                  <ArrowLeft className="w-6 h-6" />
                </button>
                <div className="w-10 h-10 rounded-full overflow-hidden bg-slate-200 shrink-0">
                  {activeChat.otherUser?.photoURL ? (
                    <img src={activeChat.otherUser.photoURL} alt="Profile" className="w-full h-full object-cover" referrerPolicy="no-referrer" />
                  ) : (
                    <User className="w-full h-full p-2 text-slate-500" />
                  )}
                </div>
                <div>
                  <h2 className="font-semibold text-[16px] text-[#111b21] leading-tight">
                    {activeChat.otherUser?.displayName || activeChat.otherUser?.email || 'Unknown User'}
                  </h2>
                  <p className="text-xs text-[#667781]">click here for contact info</p>
                </div>
              </div>
              <div className="flex items-center gap-5 text-[#54656f]">
                <Video className="w-5 h-5 cursor-pointer" onClick={() => setIsVideoCallOpen(true)} />
                <Phone className="w-5 h-5 cursor-pointer" />
                <Search className="w-5 h-5 cursor-pointer" />
                <MoreVertical className="w-5 h-5 cursor-pointer" />
              </div>
            </div>

            {/* Messages Area */}
            <div className="flex-1 overflow-y-auto w-full p-4">
              <div className="flex flex-col space-y-2">
                {messages.map((msg) => {
                  const isMe = msg.senderId === currentUser.uid;
                  return (
                    <div 
                      key={msg.id} 
                      className={cn(
                        "flex w-full",
                        isMe ? "justify-end" : "justify-start"
                      )}
                    >
                      <div className={cn(
                        "max-w-[65%] relative px-3 py-2 rounded-lg shadow-sm text-[15px]",
                        isMe ? "bg-[#dcf8c6] rounded-tr-none" : "bg-white rounded-tl-none"
                      )}>
                        {/* Tail for WhatsApp bubbles */}
                        <div className={cn(
                          "absolute top-0 w-3 h-3",
                          isMe ? "-right-2 bg-[#dcf8c6]" : "-left-2 bg-white"
                        )} style={{ clipPath: isMe ? 'polygon(0 0, 0 100%, 100% 0)' : 'polygon(100% 0, 0 0, 100% 100%)' }} />
                        
                        <p className="whitespace-pre-wrap leading-snug text-[#111b21] pb-3">{msg.text}</p>
                        
                        <div className="absolute bottom-1 right-2 flex items-center gap-1">
                          <span className="text-[10px] text-[#667781]">{formatTime(msg.timestamp)}</span>
                          {isMe && <CheckCheck className="w-3.5 h-3.5 text-[#53bdeb]" />}
                        </div>
                      </div>
                    </div>
                  );
                })}
                <div ref={messagesEndRef} />
              </div>
            </div>

            {/* Input Area */}
            <div className="bg-[#f0f2f5] px-4 py-3 flex items-end gap-3 z-10">
              <button className="p-2 text-[#54656f] hover:text-[#111b21] shrink-0 mb-1">
                <Smile className="w-6 h-6" />
              </button>
              <button className="p-2 text-[#54656f] hover:text-[#111b21] shrink-0 mb-1">
                <Paperclip className="w-5 h-5 -rotate-45" />
              </button>
              
              <div className="flex-1 bg-white rounded-xl flex items-end px-4 py-2 shadow-sm min-h-[44px]">
                <textarea
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' && !e.shiftKey) {
                      e.preventDefault();
                      handleSendMessage();
                    }
                  }}
                  placeholder="Type a message"
                  className="flex-1 max-h-[150px] bg-transparent resize-none py-1 focus:outline-none text-[#111b21] text-[15px] leading-snug"
                  rows={1}
                />
              </div>
              
              {input.trim() ? (
                <button
                  onClick={handleSendMessage}
                  className="p-3 text-[#54656f] hover:text-[#111b21] shrink-0 mb-0.5"
                >
                  <Send className="w-6 h-6" />
                </button>
              ) : (
                <button className="p-3 text-[#54656f] hover:text-[#111b21] shrink-0 mb-0.5">
                  <Mic className="w-6 h-6" />
                </button>
              )}
            </div>
          </>
        )}
      </div>

      {isVideoCallOpen && activeChat && currentUser && (
        <VideoCallModal 
          chat={activeChat} 
          currentUser={currentUser} 
          onClose={() => setIsVideoCallOpen(false)} 
        />
      )}
    </div>
  );
}
