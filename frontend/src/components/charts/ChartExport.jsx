import { useCallback, useRef } from 'react';
import { toPng, toJpeg } from 'html-to-image';

/**
 * Chart Export - 차트 내보내기 기능
 */
function ChartExport({ targetRef, filename = 'chart' }) {
    const handleExportPng = useCallback(async () => {
        if (!targetRef?.current) return;

        try {
            const dataUrl = await toPng(targetRef.current, {
                backgroundColor: '#1f2937',
                cacheBust: true,
            });

            const link = document.createElement('a');
            link.download = `${filename}.png`;
            link.href = dataUrl;
            link.click();
        } catch (error) {
            console.error('Failed to export chart:', error);
        }
    }, [targetRef, filename]);

    const handleExportJpeg = useCallback(async () => {
        if (!targetRef?.current) return;

        try {
            const dataUrl = await toJpeg(targetRef.current, {
                backgroundColor: '#1f2937',
                quality: 0.95,
            });

            const link = document.createElement('a');
            link.download = `${filename}.jpg`;
            link.href = dataUrl;
            link.click();
        } catch (error) {
            console.error('Failed to export chart:', error);
        }
    }, [targetRef, filename]);

    return (
        <div className="flex gap-2">
            <button
                onClick={handleExportPng}
                className="px-3 py-1.5 text-xs bg-white/10 hover:bg-white/20 text-gray-300 rounded-lg transition-colors flex items-center gap-1.5"
            >
                📷 PNG
            </button>
            <button
                onClick={handleExportJpeg}
                className="px-3 py-1.5 text-xs bg-white/10 hover:bg-white/20 text-gray-300 rounded-lg transition-colors flex items-center gap-1.5"
            >
                🖼️ JPG
            </button>
        </div>
    );
}

/**
 * Chart Container with Export - 내보내기 기능 포함 차트 컨테이너
 */
export function ChartContainer({ children, title, filename = 'chart' }) {
    const chartRef = useRef(null);

    return (
        <div className="space-y-2">
            <div className="flex items-center justify-between">
                <h4 className="text-sm font-semibold text-white">{title}</h4>
                <ChartExport targetRef={chartRef} filename={filename} />
            </div>
            <div ref={chartRef}>
                {children}
            </div>
        </div>
    );
}

export default ChartExport;
