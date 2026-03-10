import Button from "@/components/ui/Button";
import { Plus, FileText, Send, Mail } from "lucide-react";

interface QuickActionsProps {
    onAction: (action: string) => void;
}

export default function QuickActions({ onAction }: QuickActionsProps) {
    return (
        <div className="flex flex-wrap gap-3">
            <Button onClick={() => onAction("log_work")} className="flex items-center gap-2"><Plus size={16} /> Add Work Log</Button>
            <Button onClick={() => onAction("add_service")} className="flex items-center gap-2" variant="secondary"><Plus size={16} /> Add Service</Button>
            <Button onClick={() => onAction("generate_invoice")} className="flex items-center gap-2" variant="secondary"><FileText size={16} /> Generate Invoice</Button>
            <Button onClick={() => onAction("send_statement")} className="flex items-center gap-2" variant="secondary"><Send size={16} /> Send Statement</Button>
            <Button onClick={() => onAction("send_email")} className="flex items-center gap-2" variant="secondary"><Mail size={16} /> Send Email</Button>
        </div>
    );
}
