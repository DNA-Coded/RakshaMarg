import React, { } from 'react';
import { createPortal } from 'react-dom';
import { Shield, X, UserPlus, Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';

interface Contact {
    name: string;
    phone: string;
}

interface TrustedContactsModalProps {
    isOpen: boolean;
    onClose: () => void;
    contacts: Contact[];
    onAddContact: (name: string, phone: string) => void;
    onRemoveContact: (index: number) => void;
}

const TrustedContactsModal: React.FC<TrustedContactsModalProps> = ({
    isOpen,
    onClose,
    contacts,
    onAddContact,
    onRemoveContact,
}) => {
    const [newContactName, setNewContactName] = React.useState('');
    const [newContactPhone, setNewContactPhone] = React.useState('');

    if (!isOpen) return null;

    const handleAddClick = () => {
        if (newContactName && newContactPhone) {
            onAddContact(newContactName, newContactPhone);
            setNewContactName('');
            setNewContactPhone('');
        }
    };

    return createPortal(
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/80 backdrop-blur-sm p-4">
            <div className="bg-[#1a1a1a] border border-white/10 rounded-3xl p-6 w-full max-w-md shadow-2xl relative animate-fade-in-up">
                <button
                    onClick={onClose}
                    className="absolute top-4 right-4 p-2 bg-white/5 rounded-full hover:bg-white/10 text-white/50 hover:text-white transition-colors"
                >
                    <X className="w-5 h-5" />
                </button>

                <h2 className="text-xl font-bold text-white mb-1 flex items-center gap-2">
                    <Shield className="w-5 h-5 text-brand-purple" />
                    Trusted Contacts
                </h2>
                <p className="text-sm text-white/50 mb-6">
                    Add contacts to automatically notify them when you start tracking or trigger SOS.
                </p>

                {/* List of Contacts */}
                <div className="space-y-3 mb-6 max-h-[200px] overflow-y-auto custom-scrollbar">
                    {contacts.length === 0 ? (
                        <div className="text-center p-6 bg-white/5 rounded-2xl border border-white/5 border-dashed">
                            <UserPlus className="w-8 h-8 text-white/20 mx-auto mb-2" />
                            <p className="text-sm text-white/40">No contacts added yet.</p>
                        </div>
                    ) : (
                        contacts.map((contact, idx) => (
                            <div key={idx} className="flex items-center justify-between p-3 bg-white/5 rounded-xl border border-white/5">
                                <div className="flex items-center gap-3">
                                    <div className="w-8 h-8 rounded-full bg-brand-teal/20 flex items-center justify-center text-xs font-bold text-brand-teal">
                                        {contact.name.charAt(0)}
                                    </div>
                                    <div>
                                        <p className="text-sm font-bold text-white">{contact.name}</p>
                                        <p className="text-xs text-white/50">{contact.phone}</p>
                                    </div>
                                </div>
                                <button
                                    onClick={() => onRemoveContact(idx)}
                                    className="p-2 hover:bg-red-500/20 rounded-lg text-white/30 hover:text-red-400 transition-colors"
                                >
                                    <Trash2 className="w-4 h-4" />
                                </button>
                            </div>
                        ))
                    )}
                </div>

                {/* Add New Contact Form */}
                <div className="space-y-3 pt-4 border-t border-white/10">
                    <p className="text-xs font-bold text-white/60 uppercase tracking-wider">Add New Contact</p>
                    <div className="grid grid-cols-2 gap-3">
                        <Input
                            placeholder="Name"
                            value={newContactName}
                            onChange={(e) => setNewContactName(e.target.value)}
                            className="bg-black/20 border-white/10 text-white"
                        />
                        <Input
                            placeholder="Phone (with code)"
                            value={newContactPhone}
                            onChange={(e) => setNewContactPhone(e.target.value)}
                            className="bg-black/20 border-white/10 text-white"
                        />
                    </div>
                    <Button
                        onClick={handleAddClick}
                        disabled={!newContactName || !newContactPhone}
                        className="w-full bg-brand-purple hover:bg-brand-purple/80 text-white font-bold"
                    >
                        Add Contact
                    </Button>
                </div>
            </div>
        </div>,
        document.body
    );
};

export default TrustedContactsModal;
