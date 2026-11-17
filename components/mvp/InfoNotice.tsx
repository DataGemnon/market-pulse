/** The information-not-advice line, shown under every MVP section. */
export default function InfoNotice({ children }: { children?: React.ReactNode }) {
    return (
        <p className="px-5 py-3 text-[11px] leading-relaxed text-slate-500 border-t border-white/[0.04]">
            {children ? <>{children} </> : null}
            Information et pédagogie uniquement, pas un conseil en investissement : rien ici ne dit d&apos;acheter, de vendre ou de conserver un titre.
        </p>
    );
}
