// Skeleton Loading Components for improved UX
// Usage: <Skeleton type="card" /> or <Skeleton type="chart" />

function Skeleton({ type = 'text', className = '' }) {
    const baseClass = 'animate-pulse bg-white/10 rounded';

    const types = {
        text: 'h-4 w-3/4',
        textShort: 'h-4 w-1/2',
        title: 'h-6 w-1/2',
        avatar: 'h-10 w-10 rounded-full',
        button: 'h-10 w-24 rounded-lg',
        card: 'h-32 w-full rounded-xl',
        chart: 'h-64 w-full rounded-xl',
        metric: 'h-20 w-full rounded-lg',
        table: 'h-48 w-full rounded-lg',
    };

    return <div className={`${baseClass} ${types[type] || types.text} ${className}`} />;
}

// Preset Skeleton layouts
export function SkeletonCard() {
    return (
        <div className="bg-white/5 border border-white/10 rounded-xl p-4 space-y-3">
            <Skeleton type="title" />
            <Skeleton type="text" />
            <Skeleton type="textShort" />
        </div>
    );
}

export function SkeletonChart() {
    return (
        <div className="bg-white/5 border border-white/10 rounded-xl p-4 space-y-3">
            <Skeleton type="title" className="mb-4" />
            <Skeleton type="chart" />
        </div>
    );
}

export function SkeletonMetrics({ count = 4 }) {
    return (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {Array.from({ length: count }).map((_, i) => (
                <div key={i} className="bg-white/5 border border-white/10 rounded-xl p-4 space-y-2">
                    <Skeleton type="textShort" />
                    <Skeleton type="title" />
                </div>
            ))}
        </div>
    );
}

export function SkeletonTable({ rows = 5 }) {
    return (
        <div className="bg-white/5 border border-white/10 rounded-xl p-4 space-y-3">
            <Skeleton type="title" className="mb-4" />
            {Array.from({ length: rows }).map((_, i) => (
                <div key={i} className="flex gap-4">
                    <Skeleton type="textShort" className="flex-1" />
                    <Skeleton type="textShort" className="flex-1" />
                    <Skeleton type="textShort" className="flex-1" />
                </div>
            ))}
        </div>
    );
}

export function SkeletonInsights() {
    return (
        <div className="space-y-4">
            <SkeletonCard />
            <SkeletonMetrics count={6} />
            <SkeletonChart />
            <SkeletonTable rows={3} />
        </div>
    );
}

export function SkeletonEDA() {
    return (
        <div className="space-y-4">
            {/* Score Card */}
            <div className="bg-white/5 border border-white/10 rounded-xl p-6 flex items-center justify-between">
                <div className="space-y-2">
                    <Skeleton type="title" />
                    <Skeleton type="text" />
                </div>
                <Skeleton type="avatar" className="w-20 h-20" />
            </div>
            {/* Stats Grid */}
            <SkeletonMetrics count={4} />
            {/* Charts */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <SkeletonChart />
                <SkeletonChart />
            </div>
        </div>
    );
}

export default Skeleton;
