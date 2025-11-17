import React, { useState, useEffect, useRef, useCallback } from 'react';
import { type User, type Depot, Role, type ChatMessage } from '../types';
import { ChatBubbleIcon, CloseIcon, SendIcon } from './icons/Icons';
import { sendMessage, fetchMessages, subscribeToMessages, subscribeToAllAdminMessages } from '../services/chatService';
import { useNotification } from '../context/NotificationContext';

// Helper component for the list of conversations
interface ConversationListProps {
    isLoadingDepots: boolean;
    activeDepots: Depot[];
    unreadCounts: Record<string, number>;
    activeConversationId: string | null;
    onSelect: (conversationId: string) => void;
}

const ConversationList: React.FC<ConversationListProps> = ({ isLoadingDepots, activeDepots, unreadCounts, activeConversationId, onSelect }) => (
    <div className="w-1/3 border-r border-gray-200 bg-gray-50 flex flex-col">
        <h3 className="p-3 text-sm font-semibold text-gray-700 border-b shrink-0">Conversations</h3>
        <ul className="overflow-y-auto">
            {isLoadingDepots ? (
                <div className="p-4 text-center text-sm text-gray-500">Chargement...</div>
            ) : activeDepots.map(depot => {
                const conversationId = `depot_${depot.id}`;
                const unread = unreadCounts[conversationId] || 0;
                return (
                    <li key={depot.id}>
                        <button
                            onClick={() => onSelect(conversationId)}
                            className={`w-full text-left p-3 text-sm transition-colors flex items-center gap-3 ${activeConversationId === conversationId ? 'bg-ipt-blue text-white' : 'hover:bg-gray-200'}`}
                        >
                            <div className="w-6 h-6 rounded-full flex items-center justify-center text-white font-bold text-xs flex-shrink-0" style={{ backgroundColor: depot.color }}>
                                {depot.name.charAt(0)}
                            </div>
                            <span className="flex-grow truncate">{depot.name}</span>
                            {unread > 0 && <span className="h-5 w-5 bg-red-500 text-white text-xs rounded-full flex items-center justify-center flex-shrink-0">{unread}</span>}
                        </button>
                    </li>
                );
            })}
        </ul>
    </div>
);

// Helper component for the chat window itself
interface ChatWindowProps {
    isAdmin: boolean;
    currentUser: User;
    depots: Depot[];
    activeConversationId: string | null;
    isLoading: boolean;
    messages: ChatMessage[];
    suggestions: string[];
    newMessage: string;
    messagesEndRef: React.RefObject<HTMLDivElement>;
    onNewMessageChange: (value: string) => void;
    onSendMessage: (message: string) => void;
    onFormSubmit: (e: React.FormEvent) => void;
}

const ChatWindow: React.FC<ChatWindowProps> = ({
    isAdmin, currentUser, depots, activeConversationId, isLoading, messages, suggestions,
    newMessage, messagesEndRef, onNewMessageChange, onSendMessage, onFormSubmit
}) => (
    <div className="flex flex-col flex-1 bg-gray-100">
        <header className="p-3 border-b bg-white/80 backdrop-blur-sm shrink-0">
            <h3 className="font-semibold text-gray-800 text-center">
                {isAdmin
                    ? depots.find(d => `depot_${d.id}` === activeConversationId)?.name || 'Sélectionnez une conversation'
                    : 'Support Administratif'}
            </h3>
        </header>
        <div className="flex-1 p-4 overflow-y-auto space-y-4">
            {isLoading && messages.length === 0 && (
                <div className="flex justify-center items-center h-full">
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-ipt-blue"></div>
                </div>
            )}
            {messages.map(msg => (
                <div key={msg.id} className={`flex items-end gap-2 ${msg.sender_id === currentUser.email ? 'justify-end' : 'justify-start'}`}>
                    <div className={`flex flex-col max-w-xs md:max-w-md ${msg.sender_id === currentUser.email ? 'items-end' : 'items-start'}`}>
                        <div className={`px-4 py-2 rounded-2xl ${msg.sender_id === currentUser.email ? 'bg-ipt-blue text-white rounded-br-none' : 'bg-white shadow-sm text-gray-800 rounded-bl-none'}`}>
                            {!isAdmin && msg.sender_id !== currentUser.email && <p className="font-bold text-sm text-ipt-light-blue">{msg.sender_name}</p>}
                            <p className="text-base break-words whitespace-pre-wrap">{msg.content}</p>
                        </div>
                        <p className="text-xs text-gray-400 mt-1 px-1">{new Date(msg.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</p>
                    </div>
                </div>
            ))}
            <div ref={messagesEndRef} />
        </div>
        <div className="p-2 border-t bg-white">
            <div className="flex flex-wrap gap-2 mb-2">
                {suggestions.map((suggestion, index) => (
                    <button
                        key={index}
                        onClick={() => onSendMessage(suggestion)}
                        className="px-3 py-1 text-xs font-medium text-ipt-blue bg-blue-100 rounded-full hover:bg-blue-200 transition"
                    >
                        {suggestion}
                    </button>
                ))}
            </div>
            <form onSubmit={onFormSubmit} className="flex items-center gap-2">
                <input
                    type="text"
                    value={newMessage}
                    onChange={(e) => onNewMessageChange(e.target.value)}
                    placeholder="Écrivez votre message..."
                    className="flex-1 p-2 border border-gray-300 rounded-full focus:outline-none focus:ring-2 focus:ring-ipt-blue"
                    disabled={!activeConversationId}
                />
                <button type="submit" className="p-3 bg-ipt-blue text-white rounded-full hover:bg-ipt-light-blue transition disabled:bg-gray-400 flex-shrink-0" disabled={!activeConversationId || newMessage.trim() === ''}>
                    <SendIcon className="h-5 w-5" />
                </button>
            </form>
        </div>
    </div>
);


interface ChatProps {
    currentUser: User;
    depots: Depot[];
    isLoadingDepots: boolean;
}

const Chat: React.FC<ChatProps> = ({ currentUser, depots, isLoadingDepots }) => {
    const [isOpen, setIsOpen] = useState(false);
    const [messagesCache, setMessagesCache] = useState<Record<string, ChatMessage[]>>({});
    const [newMessage, setNewMessage] = useState('');
    const [activeConversationId, setActiveConversationId] = useState<string | null>(null);
    const [isLoading, setIsLoading] = useState(false);
    const [unreadCounts, setUnreadCounts] = useState<Record<string, number>>({});

    const messagesEndRef = useRef<HTMLDivElement>(null);
    const { addNotification } = useNotification();

    const isAdmin = currentUser.role === Role.Admin;
    const activeDepots = depots.filter(d => d.active).sort((a, b) => a.name.localeCompare(b.name));

    // Effect to set the initial conversation
    useEffect(() => {
        if (!isAdmin) {
            const depotId = currentUser.email.split('@')[0];
            setActiveConversationId(`depot_${depotId}`);
        } else if (activeDepots.length > 0 && !activeConversationId) {
            setActiveConversationId(`depot_${activeDepots[0].id}`);
        }
    }, [isAdmin, currentUser.email, activeDepots, activeConversationId]);
    
    // Effect to scroll to the bottom of messages
    useEffect(() => {
        if (isOpen) {
            messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
        }
    }, [messagesCache, activeConversationId, isOpen]);
    
    // Effect for fetching messages when a new conversation is selected
    const loadMessages = useCallback(async (convId: string) => {
        if (convId && !messagesCache[convId]) {
            setIsLoading(true);
            const { messages: initialMessages } = await fetchMessages(convId);
            if (initialMessages) {
                setMessagesCache(prev => ({...prev, [convId]: initialMessages }));
            }
            setIsLoading(false);
        }
    }, [messagesCache]);
    
    useEffect(() => {
        if (activeConversationId) {
            loadMessages(activeConversationId);
        }
    }, [activeConversationId, loadMessages]);


    // Effect for real-time subscriptions
    useEffect(() => {
        const handleNewMessage = (newMessagePayload: ChatMessage) => {
            if (!newMessagePayload) return;
            const conversationId = newMessagePayload.conversation_id;
            
            setMessagesCache(prevCache => {
                const existingMessages = prevCache[conversationId] || [];
                if (existingMessages.some(m => m.id === newMessagePayload.id)) return prevCache;
                return { ...prevCache, [conversationId]: [...existingMessages, newMessagePayload] };
            });

            if (newMessagePayload.sender_id !== currentUser.email) {
                if (!isOpen || (isOpen && activeConversationId !== conversationId)) {
                    // Fix for error on line 260: Operator '+' cannot be applied to types 'unknown' and 'number'.
                    // FIX: Explicitly type `prev` to ensure correct type inference.
                    setUnreadCounts((prev: Record<string, number>) => ({ ...prev, [conversationId]: (prev[conversationId] || 0) + 1 }));
                }
                if (!isOpen) {
                     addNotification(`Nouveau message de ${newMessagePayload.sender_name}`, 'info');
                }
            }
        };

        const subscription = isAdmin 
            ? subscribeToAllAdminMessages(handleNewMessage)
            : activeConversationId 
                ? subscribeToMessages(activeConversationId, handleNewMessage)
                : null;

        return () => { subscription?.unsubscribe(); };
    }, [isAdmin, activeConversationId, isOpen, currentUser.email, addNotification]);


    const handleSendMessage = async (content: string) => {
        if (content.trim() === '' || !activeConversationId) return;

        const optimisticMessage: ChatMessage = {
            id: `temp-${Date.now()}`,
            created_at: new Date().toISOString(),
            sender_id: currentUser.email,
            sender_name: currentUser.firstName,
            conversation_id: activeConversationId,
            content: content,
        };

        setMessagesCache(prev => ({
            ...prev,
            [activeConversationId]: [...(prev[activeConversationId] || []), optimisticMessage]
        }));
        
        const { error } = await sendMessage(currentUser.email, currentUser.firstName, activeConversationId, content);
        
        if (error) {
            addNotification("Erreur d'envoi du message.", 'error');
            setMessagesCache(prev => ({
                ...prev,
                [activeConversationId]: prev[activeConversationId].filter(m => m.id !== optimisticMessage.id)
            }));
        }
    };
    
    const handleFormSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        handleSendMessage(newMessage);
        setNewMessage('');
    };

    const handleToggleChat = () => {
        const nextState = !isOpen;
        setIsOpen(nextState);
        if (nextState && activeConversationId) {
            setUnreadCounts((prev: Record<string, number>) => ({ ...prev, [activeConversationId]: 0 }));
        }
    };

    const handleConversationSelect = (conversationId: string) => {
        setActiveConversationId(conversationId);
        setUnreadCounts((prev: Record<string, number>) => ({ ...prev, [conversationId]: 0 }));
    };
    
    // Fix for error on line 319: Operator '>' cannot be applied to types 'unknown' and 'number'.
    // FIX: Explicitly type the `sum` accumulator in `reduce` to ensure the result is a number.
    const totalUnreadCount = Object.values(unreadCounts).reduce((sum: number, count) => sum + (Number(count) || 0), 0);
    const currentMessages = activeConversationId ? messagesCache[activeConversationId] || [] : [];

    const depotSuggestions = ["J'ai une question sur un produit.", "J'ai besoin d'une FDS.", "Pouvez-vous vérifier un stock ?", "Merci !"];
    const adminSuggestions = ["Bonjour, comment puis-je aider ?", "Votre demande a été prise en compte.", "Nous vérifions et revenons vers vous.", "De rien !"];
    const suggestions = isAdmin ? adminSuggestions : depotSuggestions;
    
    return (
        <>
            <div className={`fixed bottom-24 right-4 md:right-8 bg-white rounded-2xl shadow-2xl z-50 flex flex-col overflow-hidden transition-all duration-300 ease-in-out ${isOpen ? 'w-[90vw] max-w-2xl h-[70vh] max-h-[700px] opacity-100' : 'w-0 h-0 opacity-0'}`}>
                {isAdmin ? (
                    <div className="flex h-full">
                        <ConversationList
                            isLoadingDepots={isLoadingDepots}
                            activeDepots={activeDepots}
                            unreadCounts={unreadCounts}
                            activeConversationId={activeConversationId}
                            onSelect={handleConversationSelect}
                        />
                        <ChatWindow
                            isAdmin={isAdmin}
                            currentUser={currentUser}
                            depots={depots}
                            activeConversationId={activeConversationId}
                            isLoading={isLoading}
                            messages={currentMessages}
                            suggestions={suggestions}
                            newMessage={newMessage}
                            messagesEndRef={messagesEndRef}
                            onNewMessageChange={setNewMessage}
                            onSendMessage={handleSendMessage}
                            onFormSubmit={handleFormSubmit}
                        />
                    </div>
                ) : (
                    <ChatWindow
                        isAdmin={isAdmin}
                        currentUser={currentUser}
                        depots={depots}
                        activeConversationId={activeConversationId}
                        isLoading={isLoading}
                        messages={currentMessages}
                        suggestions={suggestions}
                        newMessage={newMessage}
                        messagesEndRef={messagesEndRef}
                        onNewMessageChange={setNewMessage}
                        onSendMessage={handleSendMessage}
                        onFormSubmit={handleFormSubmit}
                    />
                )}
            </div>
            <button
                onClick={handleToggleChat}
                className="fixed bottom-4 right-4 md:right-8 w-16 h-16 bg-ipt-blue text-white rounded-full shadow-lg hover:bg-ipt-light-blue transition-transform hover:scale-110 z-50 flex items-center justify-center"
                aria-label={isOpen ? 'Fermer le chat' : 'Ouvrir le chat'}
            >
                 <div className={`transition-transform duration-300 ${isOpen ? 'rotate-180 scale-75' : 'rotate-0'}`}>
                    {isOpen ? <CloseIcon className="h-8 w-8" /> : <ChatBubbleIcon className="h-8 w-8" />}
                 </div>
                 {totalUnreadCount > 0 && !isOpen && (
                    <span className="absolute -top-1 -right-1 flex h-6 w-6 items-center justify-center rounded-full bg-red-500 text-xs font-bold text-white ring-2 ring-white">{totalUnreadCount}</span>
                )}
            </button>
        </>
    );
};

export default Chat;
