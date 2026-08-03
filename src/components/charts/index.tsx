import {
    Bar, BarChart, Cell, Pie, PieChart, ResponsiveContainer,
    Tooltip, XAxis, YAxis,
} from "recharts"
import { colors } from "../../lib/colorbase"

export interface BarDatum {
    name: string
    value: number
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
        <div className="bg-white border border-second p-5 shadow-sm rounded-2xl">
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
}

export function DistributionChart({
    title,
    subtitle,
    data,
    barColor = colors.done,
    height = 260,
}: DistributionChartProps) {
    return (
        <Card title={title} subtitle={subtitle} height={height}>
            <ResponsiveContainer width="100%" height="100%">
                <BarChart data={data} margin={{ top: 8, right: 8, left: -14, bottom: 0 }}>
                    <XAxis dataKey="name" tick={{ fontSize: 11, fill: colors.tinted }} axisLine={false} tickLine={false} />
                    <YAxis tick={{ fontSize: 11, fill: colors.tinted }} axisLine={false} tickLine={false} allowDecimals={false} />
                    <Tooltip
                        cursor={{ fill: colors.second }}
                        contentStyle={{ borderRadius: 12, border: `1px solid ${colors.second}`, fontSize: 12 }}
                    />
                    <Bar dataKey="value" radius={[6, 6, 0, 0]} fill={barColor} />
                </BarChart>
            </ResponsiveContainer>
        </Card>
    )
}

export interface DonutChartProps {
    title: string
    subtitle?: string
    data: PieDatum[]
    height?: number
    showLegend?: boolean
}

export function DonutChart({
    title,
    subtitle,
    data,
    height = 260,
    showLegend = true,
}: DonutChartProps) {
    const rows = data.map((d) => ({ ...d, color: d.color ?? colors.done }))
    const palette = [colors.done, colors.pass, colors.wrong, colors.darks, colors.tinted]
    const colored = rows.map((d, i) => ({ ...d, color: d.color ?? palette[i % palette.length] }))
    const total = colored.reduce((s, d) => s + d.value, 0)

    return (
        <Card title={title} subtitle={subtitle} height={height}>
            <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                    <Pie
                        data={colored}
                        dataKey="value"
                        nameKey="name"
                        cx="50%"
                        cy="50%"
                        innerRadius={55}
                        outerRadius={80}
                        paddingAngle={2}
                        strokeWidth={0}
                    >
                        {colored.map((d) => (
                            <Cell key={d.name} fill={d.color} />
                        ))}
                    </Pie>
                    <Tooltip
                        formatter={(value) => [value, ""]}
                        contentStyle={{ borderRadius: 12, border: `1px solid ${colors.second}`, fontSize: 12 }}
                    />
                </PieChart>
            </ResponsiveContainer>
            {showLegend && total > 0 && (
                <div className="flex flex-wrap gap-3 justify-center pt-3">
                    {colored.map((d) => (
                        <div key={d.name} className="flex items-center gap-1.5 text-xs text-tinted">
                            <span className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: d.color }} />
                            {d.name} <span className="font-semibold text-darks">{d.value}</span> ({Math.round((d.value / total) * 100)}%)
                        </div>
                    ))}
                </div>
            )}
        </Card>
    )
}