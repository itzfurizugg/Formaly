import {
    Bar, BarChart, ResponsiveContainer,
    Tooltip, XAxis, YAxis,
    type TooltipContentProps,
} from "recharts"
import { colors } from "../../lib/colorbase"

export interface BarDatum {
    name: string
    value: number
    formId: string
}

export interface PieDatum {
    name: string
    value: number
    color?: string
}

interface ChartCardProps {
    title: string
    subtitle?: string
    children: React.ReactNode
    height?: number
}

function Card({ title, subtitle, children, height = 260 }: ChartCardProps) {
    return (
        <div className="bg-white border border-second p-5 shadow-sm rounded-lg">
            <p className="font-semibold text-darks mb-0.5">{title}</p>
            {subtitle && <p className="text-xs text-tinted mb-4">{subtitle}</p>}
            <div style={{ height }}>{children}</div>
        </div>
    )
}

export interface DistributionChartProps {
    title: string
    subtitle?: string
    data: BarDatum[]
    barColor?: string
    height?: number
    onBarClick?: (formId: string) => void
}

function ChartTooltip({ active, payload, label }: TooltipContentProps) {
    if (!active || !payload?.length) return null
    return (
        <div style={{ background: "white", border: `1px solid ${colors.second}`, borderRadius: 12, padding: "8px 12px", fontSize: 12 }}>
            <p className="font-medium text-darks">{label}</p>
            <p className="text-tinted">Responden: {payload[0].value}</p>
        </div>
    )
}

export function DistributionChart({
    title,
    subtitle,
    data,
    barColor = colors.done,
    height = 260,
    onBarClick,
}: DistributionChartProps) {
    return (
        <Card title={title} subtitle={subtitle} height={height}>
            <ResponsiveContainer width="100%" height="100%">
                <BarChart data={data} margin={{ top: 8, right: 8, left: -14, bottom: 0 }}>
                    <XAxis dataKey="name" tick={{ fontSize: 11, fill: colors.tinted }} axisLine={false} tickLine={false} />
                    <YAxis tick={{ fontSize: 11, fill: colors.tinted }} axisLine={false} tickLine={false} allowDecimals={false} />
                    <Tooltip cursor={{ fill: colors.second }} content={ChartTooltip} />
                    <Bar
                        dataKey="value"
                        radius={[6, 6, 0, 0]}
                        fill={barColor}
                        style={onBarClick ? { cursor: "pointer" } : undefined}
                        onClick={(data) => {
                            const formId = (data.payload as BarDatum | undefined)?.formId
                            if (formId) onBarClick?.(formId)
                        }}
                    />
                </BarChart>
            </ResponsiveContainer>
        </Card>
    )
}