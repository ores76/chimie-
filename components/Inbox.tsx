import React, { useState } from 'react';
import { type Message } from '../types';
import { CloseIcon, EnvelopeIcon } from './icons/Icons';

interface MessageModalProps {
    message: Message;
    onClose: () => void;
}

const MessageModal: React.FC<MessageModalProps> = ({ message, onClose }) => {
    return (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex justify-center items-center z-50 p-4 animate-fade-in">
            <div className="bg-white rounded-lg shadow-2xl w-full max-w-2xl max-h-[90vh] flex flex-col">
                <div className="flex justify-between items-center p-4 border-b">
                    <h3 className="text-2xl font-bold text-ipt-blue truncate" title={message.subject}>{message.subject}</h3>
                    <button onClick={onClose} className="p-1 rounded-full text-gray-500 hover:bg-gray-200"><CloseIcon className="h-6 w-6" /></button>
                </div>
                <div className="p-6 overflow-y-auto">
                    <div className="mb-4 text-sm text-gray-600">
                        <p><strong>De:</strong> {message.from.service}</p>
                        <p><strong>Date:</strong> {new Date(message.timestamp).toLocaleString()}</p>
                    </div>
                    <div className="prose max-w-none">
                        <p className="whitespace-pre-wrap">{message.body}</p>
                    </div>
                </div>
            </div>
        </div>
    );
};


interface InboxProps {
    messages: Message[];
    onMarkAsRead: (messageId: string) => void;
}

const Inbox: React.FC<InboxProps> = ({ messages, onMarkAsRead }) => {
    const [selectedMessage, setSelectedMessage] = useState<Message | null>(null);

    const handleViewMessage = (message: Message) => {
        setSelectedMessage(message);
        if (!message.isRead) {
            onMarkAsRead(message.id);
        }
    };

    return (
        <div className="bg-white p-6 rounded-xl shadow-md border border-gray-200">
            <h2 className="text-2xl font-bold text-gray-800 mb-4 flex items-center gap-2">
                <EnvelopeIcon className="h-7 w-7 text-ipt-blue"/> Messagerie
            </h2>
            <div className="overflow-x-auto border border-gray-200 rounded-lg">
                <table className="w-full text-left">
                    <thead className="bg-gray-100 border-b border-gray-200">
                        <tr>
                            <th className="p-4 text-sm font-semibold text-gray-700 uppercase tracking-wider">De</th>
                            <th className="p-4 text-sm font-semibold text-gray-700 uppercase tracking-wider">Sujet</th>
                            <th className="p-4 text-sm font-semibold text-gray-700 uppercase tracking-wider">Date</th>
                            <th className="p-4 text-sm font-semibold text-gray-700 uppercase tracking-wider">Statut</th>
                        </tr>
                    </thead>
                    <tbody>
                        {messages.length > 0 ? messages.map((msg, index) => (
                            <tr 
                                key={msg.id} 
                                className={`${index % 2 === 0 ? 'bg-white' : 'bg-gray-50'} hover:bg-ipt-gold/10 cursor-pointer ${!msg.isRead ? 'font-bold' : ''}`}
                                onClick={() => handleViewMessage(msg)}
                            >
                                <td className="p-4 text-gray-800">{msg.from.service}</td>
                                <td className="p-4 text-gray-800">{msg.subject}</td>
                                <td className="p-4 text-gray-600">{new Date(msg.timestamp).toLocaleDateString()}</td>
                                <td className="p-4">
                                     <span className={`inline-block px-3 py-1 text-xs font-semibold rounded-full ${!msg.isRead ? 'bg-blue-100 text-blue-800' : 'bg-gray-100 text-gray-700'}`}>
                                        {!msg.isRead ? 'Nouveau' : 'Lu'}
                                    </span>
                                </td>
                            </tr>
                        )) : (
                            <tr>
                                <td colSpan={4} className="text-center p-8 text-gray-500">Votre boîte de réception est vide.</td>
                            </tr>
                        )}
                    </tbody>
                </table>
            </div>
            {selectedMessage && <MessageModal message={selectedMessage} onClose={() => setSelectedMessage(null)} />}
        </div>
    );
};

export default Inbox;
