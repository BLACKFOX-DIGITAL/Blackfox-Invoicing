import { useState, useEffect } from "react";
import Button from "@/components/ui/Button";
import { X, Settings, Plus, Trash2 } from "lucide-react";
import Input from "@/components/ui/Input";
import { getSalaryComponents, updateSalaryComponents } from "@/app/actions/hr";
import { useToast } from "@/components/ui/ToastProvider";

interface SalaryStructureModalProps {
    onClose: () => void;
}

export default function SalaryStructureModal({ onClose }: SalaryStructureModalProps) {
    const [components, setComponents] = useState<{ name: string; ratio: number }[]>([]);
    const [loading, setLoading] = useState(true);
    const [isSaving, setIsSaving] = useState(false);
    const toast = useToast();

    useEffect(() => {
        fetchComponents();
    }, []);

    const fetchComponents = async () => {
        const result = await getSalaryComponents();
        if (result.success && result.data) {
            setComponents(result.data);
        }
        setLoading(false);
    };

    const handleSave = async () => {
        setIsSaving(true);
        const result = await updateSalaryComponents(components);
        if (result.success) {
            toast.success("Salary structure updated");
            onClose();
        } else {
            toast.error(result.error || "Failed to save");
        }
        setIsSaving(false);
    };

    const addComponent = () => {
        setComponents([...components, { name: "", ratio: 0 }]);
    };

    const removeComponent = (index: number) => {
        setComponents(components.filter((_, i) => i !== index));
    };

    const updateComponent = (index: number, field: string, value: any) => {
        const newComponents = [...components];
        (newComponents[index] as any)[field] = value;
        setComponents(newComponents);
    };

    const totalRatio = components.reduce((sum, c) => sum + (parseFloat(c.ratio.toString()) || 0), 0);

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
            <div className="bg-bg-card w-full max-w-lg rounded-2xl shadow-xl border border-border-subtle flex flex-col">
                <div className="flex items-center justify-between p-6 border-b border-border">
                    <h2 className="text-xl font-bold text-text-main flex items-center gap-2">
                        <Settings size={20} className="text-primary" /> Salary Structure
                    </h2>
                    <button onClick={onClose} className="p-2 text-text-muted hover:text-text-main hover:bg-background rounded-xl transition-colors">
                        <X size={20} />
                    </button>
                </div>

                <div className="p-6 space-y-4">
                    <p className="text-sm text-text-muted">
                        Define how total gross salary is divided into components using ratios.
                        Example: 5:3.5:1:0.5 (Total: 10)
                    </p>

                    <div className="space-y-3">
                        {loading ? (
                            <div className="text-center py-4">Loading...</div>
                        ) : (
                            components.map((comp, idx) => (
                                <div key={idx} className="flex gap-3 items-end">
                                    <div className="flex-1 space-y-1">
                                        <label className="text-xs font-medium text-text-muted">Component Name</label>
                                        <Input
                                            value={comp.name}
                                            onChange={(e) => updateComponent(idx, 'name', e.target.value)}
                                            placeholder="e.g. Basic Salary"
                                        />
                                    </div>
                                    <div className="w-24 space-y-1">
                                        <label className="text-xs font-medium text-text-muted">Ratio</label>
                                        <Input
                                            type="number"
                                            step="0.1"
                                            value={comp.ratio}
                                            onChange={(e) => updateComponent(idx, 'ratio', parseFloat(e.target.value) || 0)}
                                        />
                                    </div>
                                    <button
                                        onClick={() => removeComponent(idx)}
                                        className="p-2.5 text-text-muted hover:text-status-error hover:bg-status-error/5 rounded-xl transition-colors mb-[2px]"
                                    >
                                        <Trash2 size={18} />
                                    </button>
                                </div>
                            ))
                        )}
                    </div>

                    <Button variant="secondary" onClick={addComponent} className="w-full flex items-center justify-center gap-2 mt-4">
                        <Plus size={16} /> Add Component
                    </Button>

                    <div className="mt-6 p-4 rounded-xl bg-primary/5 border border-primary/10 flex justify-between items-center">
                        <span className="text-sm font-semibold text-primary">Total Ratio Sum:</span>
                        <span className="text-lg font-bold text-primary font-mono">{totalRatio.toFixed(1)}</span>
                    </div>
                </div>

                <div className="p-6 border-t border-border bg-background/50 rounded-b-2xl flex justify-end gap-3">
                    <Button variant="secondary" onClick={onClose}>Cancel</Button>
                    <Button onClick={handleSave} disabled={isSaving || components.length === 0}>
                        {isSaving ? "Saving..." : "Save Structure"}
                    </Button>
                </div>
            </div>
        </div>
    );
}
