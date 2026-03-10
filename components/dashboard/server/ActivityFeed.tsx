import { getRecentActivity } from "@/app/actions/dashboard";
import Card from "@/components/ui/Card";
import Button from "@/components/ui/Button";

export default async function ActivityFeed() {
    const activityResult = await getRecentActivity();
    const recentActivity = activityResult.success ? activityResult.data : [];

    return (
        <Card className="p-6 h-full">
            <div className="flex justify-between items-center mb-6">
                <h3 className="text-lg font-bold text-text-main">Recent Activity</h3>
                <Button variant="ghost" size="sm" className="text-primary hover:bg-primary/5">View All</Button>
            </div>

            <div className="space-y-6">
                {recentActivity.length === 0 ? (
                    <p className="text-text-muted text-sm text-center py-4">No recent activity</p>
                ) : (
                    recentActivity.map((item) => (
                        <div key={item.id} className="flex items-start gap-4 group">
                            <div className={`mt-1 w-2 h-2 rounded-full ring-4 ring-opacity-20 flex-shrink-0 ${item.type === 'invoice' ? 'bg-blue-500 ring-blue-500' :
                                    item.type === 'payment' ? 'bg-green-500 ring-green-500' :
                                        item.type === 'work' ? 'bg-purple-500 ring-purple-500' :
                                            'bg-gray-400 ring-gray-400'
                                }`} />
                            <div className="flex-1 pb-6 border-b border-border-subtle group-last:border-0 group-last:pb-0">
                                <div className="flex justify-between items-start">
                                    <div>
                                        <p className="text-sm font-semibold text-text-main">{item.action}</p>
                                        <p className="text-xs text-text-muted mt-0.5">
                                            <span className="font-medium text-text-main">{item.target}</span> • {new Date(item.time).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                        </p>
                                    </div>
                                    <span className="text-[10px] uppercase font-bold tracking-wider text-text-muted bg-bg-surface px-2 py-1 rounded-full">
                                        {item.type}
                                    </span>
                                </div>
                            </div>
                        </div>
                    ))
                )}
            </div>
        </Card>
    );
}
