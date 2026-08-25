import {
    Bar, BarChart, ResponsiveContainer,
    Tooltip, XAxis, YAxis, PieChart, Pie, Cell, Legend, LabelList,
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
    title?: string
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

export interface MiniDistributionChartProps {
    title?: string
    data: BarDatum[]
    barColor?: string
    height?: number
    onBarClick?: (formId: string) => void
}

/** Varian ringkas DistributionChart untuk layar kecil (mobile): tanpa sumbu Y,
 * nilai ditampilkan di atas batang supaya tetap terbaca di ruang sempit. */
export function MiniDistributionChart({
    title = "Responden per Form",
    data,
    barColor = colors.done,
    height = 150,
    onBarClick,
}: MiniDistributionChartProps) {
    return (
        <div className="bg-white border border-second shadow-sm rounded-xl px-3.5 pt-3 pb-2">
            {title && <p className="text-xs font-semibold text-darks mb-2">{title}</p>}
            <div style={{ height }}>
                <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={data} margin={{ top: 12, right: 4, left: 4, bottom: 0 }}>
                        <XAxis dataKey="name" tick={{ fontSize: 10, fill: colors.tinted }} axisLine={false} tickLine={false} />
                        <Tooltip cursor={{ fill: colors.second }} content={ChartTooltip} />
                        <Bar
                            dataKey="value"
                            radius={[5, 5, 0, 0]}
                            fill={barColor}
                            style={onBarClick ? { cursor: "pointer" } : undefined}
                            onClick={(data) => {
                                const formId = (data.payload as BarDatum | undefined)?.formId
                                if (formId) onBarClick?.(formId)
                            }}
                        >
                            <LabelList dataKey="value" position="top" style={{ fontSize: 10, fill: colors.tinted }} />
                        </Bar>
                    </BarChart>
                </ResponsiveContainer>
            </div>
        </div>
    )
}

export interface DonutChartProps {
    title?: string
    subtitle?: string
    data: PieDatum[]
    height?: number
    bare?: boolean
    showLegend?: boolean
}

export function DonutChart({ title, subtitle, data, height = 260, bare = false, showLegend = true }: DonutChartProps) {
    const pie = (
        <ResponsiveContainer width="100%" height="100%">
            <PieChart>
                <Pie data={data} dataKey="value" nameKey="name" innerRadius="55%" outerRadius="80%" paddingAngle={2} strokeWidth={0}>
                    {data.map((d, i) => (
                        <Cell key={i} fill={d.color ?? colors.done} />
                    ))}
                </Pie>
                <Tooltip />
                {showLegend && <Legend iconType="circle" wrapperStyle={{ fontSize: 12 }} />}
            </PieChart>
        </ResponsiveContainer>
    )

    if (bare) {
        return <div style={{ height }}>{pie}</div>
    }
    return (
        <Card title={title} subtitle={subtitle} height={height}>
            {pie}
        </Card>
    )
}