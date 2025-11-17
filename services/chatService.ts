import { supabase } from './supabaseClient';
import { type ChatMessage } from '../types';

export const sendMessage = async (
    sender_id: string,
    sender_name: string,
    conversation_id: string,
    content: string
): Promise<{ error: any }> => {
    const { error } = await supabase.from('chat_messages').insert({
        sender_id,
        sender_name,
        conversation_id,
        content,
    });
    return { error };
};

export const fetchMessages = async (conversationId: string): Promise<{ messages: ChatMessage[] | null, error: any }> => {
    const { data, error } = await supabase
        .from('chat_messages')
        .select('*')
        .eq('conversation_id', conversationId)
        .order('created_at', { ascending: true });
    
    return { messages: data, error };
};

// For Depot users: subscribes to a single, specific conversation
export const subscribeToMessages = (
    conversationId: string,
    onNewMessage: (newMessage: ChatMessage) => void
) => {
    const subscription = supabase
        .channel(`chat:${conversationId}`)
        .on(
            'postgres_changes',
            { event: 'INSERT', schema: 'public', table: 'chat_messages', filter: `conversation_id=eq.${conversationId}` },
            (payload) => {
                onNewMessage(payload.new as ChatMessage);
            }
        )
        .subscribe();

    return subscription;
};

// For Admin users: subscribes to all conversations
export const subscribeToAllAdminMessages = (
    onNewMessage: (newMessage: ChatMessage) => void
) => {
    const subscription = supabase
        .channel('admin-all-chats')
        .on(
            'postgres_changes',
            { event: 'INSERT', schema: 'public', table: 'chat_messages' },
            (payload) => {
                onNewMessage(payload.new as ChatMessage);
            }
        )
        .subscribe();
        
    return subscription;
};