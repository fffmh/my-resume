import { str } from './util'
import type { ResumeData } from './merge'

export const STYLE_NAMES: Record<string, string> = {
  aurora: '极光 · 现代',
  minimal: '静界 · 简洁',
  classic: '曜石 · 经典',
  royal: '鎏金 · 商务',
  holotech: '全息 · 科技',
  mono: '极客 · 终端',
  ocean: '深海 · 渐变',
  paper: '白纸 · 打印',
}

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
}

/** JD 关键词高亮（中英文词） */
function highlight(text: string, keywords: Set<string>): string {
  let out = escapeHtml(text)
  for (const kw of Array.from(keywords).sort((a, b) => b.length - a.length)) {
    if (kw.length < 2) continue
    const escaped = escapeHtml(kw)
    const re = new RegExp(`(${escaped.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')})`, 'gi')
    out = out.replace(re, '<mark>$1</mark>')
  }
  return out
}

function bullets(value: unknown, keywords: Set<string>): string {
  return str(value)
    .split(/\r?\n/)
    .map((l) => l.trim())
    .filter(Boolean)
    .map((l) => `<li>${highlight(l, keywords)}</li>`)
    .join('')
}

function fmtRange(start: string, end: string): string {
  const s = start.trim()
  const e = end.trim()
  if (!s && !e) return ''
  if (!e || e === '至今' || e === '现在') return s ? `${s} – 至今` : '至今'
  return `${s} – ${e}`
}

function contactChips(data: ResumeData): string {
  const b = data.basic
  const chips: string[] = []
  if (b.phone) chips.push(`<span class="chip">${escapeHtml(b.phone)}</span>`)
  if (b.email) chips.push(`<span class="chip">${escapeHtml(b.email)}</span>`)
  if (b.city) chips.push(`<span class="chip">${escapeHtml(b.city)}</span>`)
  if (b.years) chips.push(`<span class="chip">${escapeHtml(b.years)}经验</span>`)
  if (b.degree) chips.push(`<span class="chip">${escapeHtml(b.degree)}</span>`)
  if (b.homepage) chips.push(`<span class="chip">${escapeHtml(b.homepage)}</span>`)
  return chips.join('')
}

const SHARED_CSS = `
  * { box-sizing: border-box; margin: 0; padding: 0; }
  body { font-family: 'Hanken Grotesk', 'Microsoft YaHei UI', 'PingFang SC', system-ui, sans-serif; }
  h1, h2, h3, .name { font-family: 'Archivo', 'Hanken Grotesk', 'Microsoft YaHei UI', sans-serif; }
  ul { list-style: none; }
  li { position: relative; padding-left: 16px; margin: 4px 0; line-height: 1.65; font-size: 13px; color: #c7d2f0; }
  li::before { content: ''; position: absolute; left: 2px; top: 8px; width: 5px; height: 5px; border-radius: 50%; background: var(--accent); box-shadow: 0 0 8px var(--accent); }
  mark { background: rgba(56,225,255,.22); color: #aef3ff; border-radius: 3px; padding: 0 2px; }
  .sec-title { display: flex; align-items: center; gap: 10px; font-size: 15px; font-weight: 700; letter-spacing: .08em; color: #eaf0ff; margin-bottom: 12px; }
  .sec-title::after { content: ''; flex: 1; height: 1px; background: linear-gradient(90deg, var(--accent), transparent); opacity: .5; }
  .muted { color: #8d9ac0; }
`

function section(title: string, body: string): string {
  if (!body) return ''
  return `<section><h2 class="sec-title">${title}</h2>${body}</section>`
}

/** 极光 · 现代：左右分栏 + 玻璃卡 + 青蓝渐变 */
function renderAurora(data: ResumeData, keywords: Set<string>): string {
  const b = data.basic
  const workItems = data.work
    .map((w) => {
      const content = bullets(w.content, keywords)
      const achievement = str(w.achievement).split(/\r?\n/).filter(Boolean).join('；')
      return `<div class="item">
        <div class="row"><span class="t">${escapeHtml(str(w.position))}</span><span class="muted">${escapeHtml(str(w.company))} · ${escapeHtml(fmtRange(str(w.start), str(w.end)))}</span></div>
        <ul>${content}${achievement ? `<li class="achieve">${highlight(achievement, keywords)}</li>` : ''}</ul>
      </div>`
    })
    .join('')
  const projectItems = data.project
    .map((p) => `<div class="item">
      <div class="row"><span class="t">${escapeHtml(str(p.name))}</span><span class="muted">${escapeHtml(str(p.role))} · ${escapeHtml(fmtRange(str(p.start), str(p.end)))}</span></div>
      ${str(p.tech) ? `<div class="tech">${escapeHtml(str(p.tech))}</div>` : ''}
      <ul>${bullets(p.desc, keywords)}${bullets(p.contribution, keywords)}</ul>
    </div>`)
    .join('')
  const eduItems = data.education
    .map((e) => `<div class="item">
      <div class="row"><span class="t">${escapeHtml(str(e.school))}</span><span class="muted">${escapeHtml(str(e.major))} · ${escapeHtml(fmtRange(str(e.start), str(e.end)))}</span></div>
      ${str(e.honor) ? `<ul>${bullets(e.honor, keywords)}</ul>` : ''}
    </div>`)
    .join('')
  const skillItems = data.skills
    .map((s) => `<div class="skill"><span>${escapeHtml(str(s.name))}</span><span class="lv">${escapeHtml(str(s.level))}</span></div>`)
    .join('')
  const certItems = data.certificate
    .map((c) => `<div class="cert">${escapeHtml(str(c.name))}<span class="muted">${escapeHtml(str(c.org))} · ${escapeHtml(str(c.date))}</span></div>`)
    .join('')

  return `<!doctype html><html lang="zh-CN"><head><meta charset="utf-8"/>
<link href="https://fonts.googleapis.com/css2?family=Archivo:wght@500;700;800&family=Hanken+Grotesk:wght@300;400;500;600&display=swap" rel="stylesheet"/>
<style>
:root { --accent: #38e1ff; }
${SHARED_CSS}
.page { width: 794px; min-height: 1123px; margin: 0 auto; padding: 40px; background:
  radial-gradient(1200px 500px at 15% -10%, rgba(56,225,255,.16), transparent 55%),
  radial-gradient(900px 500px at 110% 20%, rgba(79,124,255,.18), transparent 55%),
  linear-gradient(160deg, #070b16, #0b1122 55%, #0a0f1e);
}
.card { padding: 36px 40px; border-radius: 24px; border: 1px solid rgba(255,255,255,.12);
  background: rgba(255,255,255,.045); backdrop-filter: blur(20px); box-shadow: 0 24px 60px rgba(0,0,0,.45); }
.head { display: flex; align-items: flex-end; justify-content: space-between; gap: 24px; margin-bottom: 28px; }
.name { font-size: 44px; font-weight: 800; letter-spacing: .02em; line-height: 1.05;
  background: linear-gradient(100deg, #eaf0ff 10%, #38e1ff 55%, #7aa2ff 90%);
  -webkit-background-clip: text; background-clip: text; color: transparent; }
.role { margin-top: 10px; color: #9fb0dd; font-size: 15px; letter-spacing: .12em; }
.head .side { text-align: right; }
.badge { display: inline-block; padding: 6px 14px; border-radius: 999px; font-size: 12px; letter-spacing: .1em;
  color: #06121a; font-weight: 700; background: linear-gradient(90deg, #38e1ff, #6ea8ff); box-shadow: 0 0 24px rgba(56,225,255,.45); }
.chips { display: flex; flex-wrap: wrap; gap: 8px; margin-bottom: 24px; }
.chip { padding: 5px 12px; border-radius: 999px; font-size: 12px; color: #c7d2f0;
  border: 1px solid rgba(255,255,255,.14); background: rgba(255,255,255,.04); }
.grid { display: grid; grid-template-columns: 1fr 1fr; gap: 26px 36px; }
.item { margin-bottom: 18px; }
.row { display: flex; justify-content: space-between; gap: 12px; align-items: baseline; margin-bottom: 6px; }
.t { font-weight: 700; font-size: 14px; color: #eaf0ff; }
.skill { display: flex; justify-content: space-between; padding: 8px 0; border-bottom: 1px dashed rgba(255,255,255,.1); font-size: 13px; color: #d6def8; }
.lv { color: #38e1ff; font-size: 12px; }
.cert { display: flex; justify-content: space-between; font-size: 13px; color: #d6def8; padding: 6px 0; }
.self { font-size: 13.5px; line-height: 1.8; color: #c7d2f0; }
.achieve { color: #aef3ff; }
.foot { margin-top: 22px; text-align: center; font-size: 11px; color: #5a6a94; letter-spacing: .2em; }
</style></head><body><div class="page"><div class="card">
  <div class="head">
    <div><div class="name">${escapeHtml(b.name || '未填写姓名')}</div><div class="role">${escapeHtml(data.targetJob || data.intention.position || '')}</div></div>
    <div class="side"><span class="badge">RESUME</span></div>
  </div>
  <div class="chips">${contactChips(data)}</div>
  <div class="grid">
    <div>
      ${section('求职意向', data.intention.position ? `<div class="item"><div class="row"><span class="t">${escapeHtml(str(data.intention.position))}</span><span class="muted">${escapeHtml(str(data.intention.salary))} · ${escapeHtml(str(data.intention.city))}</span></div></div>` : '')}
      ${section('工作经历', workItems)}
      ${section('项目经历', projectItems)}
    </div>
    <div>
      ${section('技能特长', skillItems)}
      ${section('教育经历', eduItems)}
      ${section('证书资质', certItems)}
      ${section('自我评价', data.self ? `<div class="self">${highlight(data.self, keywords)}</div>` : '')}
    </div>
  </div>
</div><div class="foot">RESUME · ${escapeHtml(data.targetJob || 'GENERATED')}</div></div></body></html>`
}

/** 静界 · 简洁：单栏极简 + 青金点缀 */
function renderMinimal(data: ResumeData, keywords: Set<string>): string {
  const b = data.basic
  const rows = (entries: { title: string; sub: string; range: string; extra: string; list: string }[]) =>
    entries.map((e) => `<div class="item">
      <div class="row"><span class="t">${e.title}</span><span class="muted">${e.range}</span></div>
      ${e.sub ? `<div class="sub">${e.sub}</div>` : ''}
      ${e.list ? `<ul>${e.list}</ul>` : ''}${e.extra || ''}
    </div>`).join('')

  const work = rows(data.work.map((w) => ({
    title: escapeHtml(str(w.position)), sub: escapeHtml(str(w.company)),
    range: escapeHtml(fmtRange(str(w.start), str(w.end))),
    extra: str(w.achievement) ? `<div class="gain">${highlight(str(w.achievement).split(/\r?\n/).filter(Boolean).join('；'), keywords)}</div>` : '',
    list: bullets(w.content, keywords),
  })))
  const projects = rows(data.project.map((p) => ({
    title: escapeHtml(str(p.name)), sub: `${escapeHtml(str(p.role))}${str(p.tech) ? ' · ' + escapeHtml(str(p.tech)) : ''}`,
    range: escapeHtml(fmtRange(str(p.start), str(p.end))), extra: '', list: bullets(p.desc, keywords) + bullets(p.contribution, keywords),
  })))
  const education = rows(data.education.map((e) => ({
    title: escapeHtml(str(e.school)), sub: `${escapeHtml(str(e.major))}${str(e.degree) ? ' · ' + escapeHtml(str(e.degree)) : ''}`,
    range: escapeHtml(fmtRange(str(e.start), str(e.end))), extra: '', list: bullets(e.honor, keywords),
  })))
  const skills = data.skills.map((s) => `<span class="tag">${escapeHtml(str(s.name))}</span>`).join('')

  return `<!doctype html><html lang="zh-CN"><head><meta charset="utf-8"/>
<link href="https://fonts.googleapis.com/css2?family=Archivo:wght@500;700;800&family=Hanken+Grotesk:wght@300;400;500;600&display=swap" rel="stylesheet"/>
<style>
:root { --accent: #d9b76a; }
${SHARED_CSS}
.page { width: 794px; min-height: 1123px; margin: 0 auto; padding: 44px;
  background: radial-gradient(900px 420px at 50% -8%, rgba(217,183,106,.14), transparent 60%), linear-gradient(170deg, #080c18, #0b1226); }
.card { padding: 40px 48px; border-radius: 6px; border: 1px solid rgba(255,255,255,.1); background: rgba(255,255,255,.03); }
.head { padding-bottom: 22px; border-bottom: 1px solid rgba(255,255,255,.1); margin-bottom: 26px; }
.name { font-size: 42px; font-weight: 800; letter-spacing: .04em; color: #f2f5ff; }
.role { margin-top: 8px; color: #d9b76a; letter-spacing: .18em; font-size: 13px; }
.meta { display: flex; flex-wrap: wrap; gap: 16px; margin-top: 16px; color: #8d9ac0; font-size: 12.5px; }
.item { margin-bottom: 20px; }
.sub { color: #9fb0dd; font-size: 13px; margin-bottom: 4px; }
.gain { margin: 6px 0 4px; font-size: 12.5px; color: #e6cf9a; }
.tag { display: inline-block; padding: 4px 12px; margin: 0 6px 8px 0; border-radius: 999px; font-size: 12px;
  color: #e6cf9a; border: 1px solid rgba(217,183,106,.35); background: rgba(217,183,106,.08); }
.self { font-size: 13.5px; line-height: 1.85; color: #c7d2f0; }
</style></head><body><div class="page"><div class="card">
  <div class="head">
    <div class="name">${escapeHtml(b.name || '未填写姓名')}</div>
    <div class="role">${escapeHtml(data.targetJob || data.intention.position || '')}</div>
    <div class="meta">
      ${[b.phone, b.email, b.city, b.years ? b.years + '经验' : '', b.degree, b.homepage].filter(Boolean).map((x) => `<span>${escapeHtml(x!)}</span>`).join('')}
    </div>
  </div>
  ${section('求职意向', data.intention.position ? `<div class="item"><span class="t">${escapeHtml(str(data.intention.position))}</span><span class="muted">　${escapeHtml(str(data.intention.salary))} · ${escapeHtml(str(data.intention.city))}</span></div>` : '')}
  ${section('工作经历', work)}
  ${section('项目经历', projects)}
  ${section('教育经历', education)}
  ${section('技能特长', skills ? `<div>${skills}</div>` : '')}
  ${section('自我评价', data.self ? `<div class="self">${highlight(data.self, keywords)}</div>` : '')}
</div></div></body></html>`
}

/** 曜石 · 经典：经典双栏 + 紫蓝渐变 */
function renderClassic(data: ResumeData, keywords: Set<string>): string {
  const b = data.basic
  const workItems = data.work.map((w) => `<div class="item">
    <div class="row"><span class="t">${escapeHtml(str(w.position))} · ${escapeHtml(str(w.company))}</span><span class="muted">${escapeHtml(fmtRange(str(w.start), str(w.end)))}</span></div>
    <ul>${bullets(w.content, keywords)}${bullets(w.achievement, keywords)}</ul>
  </div>`).join('')
  const projectItems = data.project.map((p) => `<div class="item">
    <div class="row"><span class="t">${escapeHtml(str(p.name))}</span><span class="muted">${escapeHtml(str(p.role))} · ${escapeHtml(fmtRange(str(p.start), str(p.end)))}</span></div>
    ${str(p.tech) ? `<div class="sub">${escapeHtml(str(p.tech))}</div>` : ''}
    <ul>${bullets(p.desc, keywords)}${bullets(p.contribution, keywords)}</ul>
  </div>`).join('')
  const eduItems = data.education.map((e) => `<div class="item">
    <div class="row"><span class="t">${escapeHtml(str(e.school))}</span><span class="muted">${escapeHtml(fmtRange(str(e.start), str(e.end)))}</span></div>
    <div class="sub">${escapeHtml(str(e.major))}${str(e.degree) ? ' · ' + escapeHtml(str(e.degree)) : ''}</div>
  </div>`).join('')
  const skillItems = data.skills.map((s) => `<div class="skill-row"><span>${escapeHtml(str(s.name))}</span><span class="muted">${escapeHtml(str(s.level))}${str(s.years) ? ' · ' + escapeHtml(str(s.years)) : ''}</span></div>`).join('')
  const certItems = data.certificate.map((c) => `<div class="item">${escapeHtml(str(c.name))}<div class="sub muted">${escapeHtml(str(c.org))} · ${escapeHtml(str(c.date))}</div></div>`).join('')

  return `<!doctype html><html lang="zh-CN"><head><meta charset="utf-8"/>
<link href="https://fonts.googleapis.com/css2?family=Archivo:wght@500;700;800&family=Hanken+Grotesk:wght@300;400;500;600&display=swap" rel="stylesheet"/>
<style>
:root { --accent: #a78bfa; }
${SHARED_CSS}
.page { width: 794px; min-height: 1123px; margin: 0 auto; padding: 40px;
  background: radial-gradient(1000px 460px at 85% -10%, rgba(167,139,250,.16), transparent 55%), linear-gradient(165deg, #070b16, #0b1022); }
.card { padding: 38px 42px; border-radius: 18px; border: 1px solid rgba(255,255,255,.12); background: rgba(255,255,255,.04); backdrop-filter: blur(18px); }
.name { font-size: 46px; font-weight: 800; letter-spacing: .03em; background: linear-gradient(100deg, #f2f5ff, #b9a7ff 70%, #8ec5ff);
  -webkit-background-clip: text; background-clip: text; color: transparent; }
.role { margin: 10px 0 18px; color: #a7c8ff; font-size: 14px; letter-spacing: .14em; }
.chips { display: flex; flex-wrap: wrap; gap: 8px; margin-bottom: 24px; }
.chip { padding: 4px 12px; border-radius: 4px; font-size: 12px; color: #d6def8; border: 1px solid rgba(255,255,255,.12); background: rgba(255,255,255,.04); }
.grid { display: grid; grid-template-columns: 210px 1fr; gap: 30px; }
.side .sec-title { font-size: 13px; }
.skill-row { display: flex; justify-content: space-between; gap: 8px; font-size: 12.5px; color: #d6def8; padding: 5px 0; }
.sub { font-size: 12.5px; color: #9fb0dd; margin: 3px 0 8px; }
.self { font-size: 13px; line-height: 1.8; color: #c7d2f0; }
</style></head><body><div class="page"><div class="card">
  <div class="name">${escapeHtml(b.name || '未填写姓名')}</div>
  <div class="role">${escapeHtml(data.targetJob || data.intention.position || '')}</div>
  <div class="chips">${contactChips(data)}</div>
  <div class="grid">
    <div class="side">
      ${section('求职意向', data.intention.position ? `<div class="item">${escapeHtml(str(data.intention.position))}<div class="sub">${escapeHtml(str(data.intention.salary))} · ${escapeHtml(str(data.intention.city))}</div></div>` : '')}
      ${section('技能特长', skillItems)}
      ${section('证书资质', certItems)}
    </div>
    <div>
      ${section('工作经历', workItems)}
      ${section('项目经历', projectItems)}
      ${section('教育经历', eduItems)}
      ${section('自我评价', data.self ? `<div class="self">${highlight(data.self, keywords)}</div>` : '')}
    </div>
  </div>
</div></div></body></html>`
}


/** 鎏金 · 商务：金/深蓝，精致居中排版 */
function renderRoyal(data: ResumeData, keywords: Set<string>): string {
  const b = data.basic
  const workItems = data.work.map((w) => `<div class="item">
    <div class="row"><span class="t">${escapeHtml(str(w.position))} · ${escapeHtml(str(w.company))}</span><span class="muted">${escapeHtml(fmtRange(str(w.start), str(w.end)))}</span></div>
    <ul>${bullets(w.content, keywords)}${bullets(w.achievement, keywords)}</ul>
  </div>`).join('')
  const projectItems = data.project.map((p) => `<div class="item">
    <div class="row"><span class="t">${escapeHtml(str(p.name))}</span><span class="muted">${escapeHtml(str(p.role))} · ${escapeHtml(fmtRange(str(p.start), str(p.end)))}</span></div>
    ${str(p.tech) ? `<div class="sub">${escapeHtml(str(p.tech))}</div>` : ''}
    <ul>${bullets(p.desc, keywords)}${bullets(p.contribution, keywords)}</ul>
  </div>`).join('')
  const eduItems = data.education.map((e) => `<div class="item">
    <div class="row"><span class="t">${escapeHtml(str(e.school))}</span><span class="muted">${escapeHtml(fmtRange(str(e.start), str(e.end)))}</span></div>
    <div class="sub">${escapeHtml(str(e.major))}${str(e.degree) ? ' · ' + escapeHtml(str(e.degree)) : ''}</div>
  </div>`).join('')
  const skillItems = data.skills.map((s) => `<span class="tag">${escapeHtml(str(s.name))}</span>`).join('')
  const certItems = data.certificate.map((c) => `<div class="cert">${escapeHtml(str(c.name))}<span class="muted">${escapeHtml(str(c.org))}</span></div>`).join('')

  return `<!doctype html><html lang="zh-CN"><head><meta charset="utf-8"/>
<link href="https://fonts.googleapis.com/css2?family=Archivo:wght@500;700;800&family=Hanken+Grotesk:wght@300;400;500;600&display=swap" rel="stylesheet"/>
<style>
:root { --accent: #d9b76a; }
${SHARED_CSS}
.page { width: 794px; min-height: 1123px; margin: 0 auto; padding: 44px;
  background: radial-gradient(900px 420px at 50% -8%, rgba(217,183,106,.16), transparent 60%), linear-gradient(170deg, #080b18, #0b1022); }
.card { padding: 40px 50px; border-radius: 4px; border: 1px solid rgba(217,183,106,.28); background: rgba(255,255,255,.03); box-shadow: 0 24px 60px rgba(0,0,0,.45); }
.head { text-align: center; padding-bottom: 22px; border-bottom: 1px solid rgba(217,183,106,.25); margin-bottom: 26px; }
.name { font-size: 44px; font-weight: 800; letter-spacing: .06em; color: #f3edd6; }
.role { margin-top: 10px; color: #d9b76a; letter-spacing: .3em; font-size: 13px; }
.meta { display: flex; justify-content: center; flex-wrap: wrap; gap: 14px; margin-top: 16px; color: #9aa5c8; font-size: 12.5px; }
.grid { display: grid; grid-template-columns: 1fr 1fr; gap: 24px 40px; }
.item { margin-bottom: 18px; }
.tag { display: inline-block; padding: 4px 12px; margin: 0 6px 8px 0; border-radius: 2px; font-size: 12px; color: #e6cf9a; border: 1px solid rgba(217,183,106,.35); background: rgba(217,183,106,.06); }
.cert { display: flex; justify-content: space-between; font-size: 13px; color: #d6ddf2; padding: 6px 0; }
.self { font-size: 13.5px; line-height: 1.85; color: #c6cee8; }
</style></head><body><div class="page"><div class="card">
  <div class="head">
    <div class="name">${escapeHtml(b.name || '未填写姓名')}</div>
    <div class="role">${escapeHtml(data.targetJob || data.intention.position || '')}</div>
    <div class="meta">${[b.phone, b.email, b.city, b.years ? b.years + '经验' : '', b.degree, b.homepage].filter(Boolean).map((x) => `<span>${escapeHtml(x!)}</span>`).join('')}</div>
  </div>
  <div class="grid">
    <div>
      ${section('求职意向', data.intention.position ? `<div class="item"><span class="t">${escapeHtml(str(data.intention.position))}</span><span class="muted">　${escapeHtml(str(data.intention.salary))} · ${escapeHtml(str(data.intention.city))}</span></div>` : '')}
      ${section('工作经历', workItems)}
      ${section('项目经历', projectItems)}
    </div>
    <div>
      ${section('技能特长', skillItems ? `<div>${skillItems}</div>` : '')}
      ${section('教育经历', eduItems)}
      ${section('证书资质', certItems)}
      ${section('自我评价', data.self ? `<div class="self">${highlight(data.self, keywords)}</div>` : '')}
    </div>
  </div>
</div></div></body></html>`
}

/** 全息 · 科技：青蓝辉光 HUD 风格 */
function renderHolotech(data: ResumeData, keywords: Set<string>): string {
  const b = data.basic
  const workItems = data.work.map((w) => `<div class="item">
    <div class="row"><span class="t">${escapeHtml(str(w.position))}</span><span class="muted">${escapeHtml(str(w.company))} · ${escapeHtml(fmtRange(str(w.start), str(w.end)))}</span></div>
    <ul>${bullets(w.content, keywords)}${bullets(w.achievement, keywords)}</ul>
  </div>`).join('')
  const projectItems = data.project.map((p) => `<div class="item">
    <div class="row"><span class="t">${escapeHtml(str(p.name))}</span><span class="muted">${escapeHtml(str(p.role))} · ${escapeHtml(fmtRange(str(p.start), str(p.end)))}</span></div>
    ${str(p.tech) ? `<div class="tech">${escapeHtml(str(p.tech))}</div>` : ''}
    <ul>${bullets(p.desc, keywords)}${bullets(p.contribution, keywords)}</ul>
  </div>`).join('')
  const eduItems = data.education.map((e) => `<div class="item">
    <div class="row"><span class="t">${escapeHtml(str(e.school))}</span><span class="muted">${escapeHtml(str(e.major))} · ${escapeHtml(fmtRange(str(e.start), str(e.end)))}</span></div>
    ${str(e.honor) ? `<ul>${bullets(e.honor, keywords)}</ul>` : ''}
  </div>`).join('')
  const skillItems = data.skills.map((s) => `<span class="tag">${escapeHtml(str(s.name))}<i>${escapeHtml(str(s.level))}</i></span>`).join('')
  const certItems = data.certificate.map((c) => `<span class="cert">${escapeHtml(str(c.name))}</span>`).join('')

  return `<!doctype html><html lang="zh-CN"><head><meta charset="utf-8"/>
<link href="https://fonts.googleapis.com/css2?family=Archivo:wght@500;700;800&family=Hanken+Grotesk:wght@300;400;500;600&display=swap" rel="stylesheet"/>
<style>
:root { --accent: #38e1ff; }
${SHARED_CSS}
.page { width: 794px; min-height: 1123px; margin: 0 auto; padding: 40px;
  background:
    radial-gradient(700px 360px at 12% -8%, rgba(56,225,255,.16), transparent 60%),
    radial-gradient(760px 420px at 108% 8%, rgba(79,124,255,.18), transparent 60%),
    linear-gradient(165deg, #04060d, #070c1a 60%, #050913);
  position: relative; }
.page::before { content: ''; position: absolute; inset: 0; pointer-events: none;
  background-image: linear-gradient(rgba(56,225,255,.05) 1px, transparent 1px), linear-gradient(90deg, rgba(56,225,255,.05) 1px, transparent 1px);
  background-size: 40px 40px; }
.card { position: relative; padding: 36px 42px; border-radius: 12px; border: 1px solid rgba(56,225,255,.3);
  background: rgba(7,13,28,.6); backdrop-filter: blur(12px); box-shadow: 0 0 42px rgba(56,225,255,.12), inset 0 0 22px rgba(56,225,255,.04); }
.head { display: flex; align-items: center; justify-content: space-between; gap: 20px; padding-bottom: 18px; border-bottom: 1px solid rgba(56,225,255,.22); margin-bottom: 24px; }
.name { font-size: 40px; font-weight: 800; letter-spacing: .02em; color: #eaf6ff; text-shadow: 0 0 22px rgba(56,225,255,.5); }
.role { margin-top: 8px; color: #38e1ff; letter-spacing: .2em; font-size: 12.5px; }
.badge { padding: 6px 12px; border-radius: 4px; font-size: 11px; letter-spacing: .18em; color: #03141c; font-weight: 700; background: linear-gradient(90deg, #38e1ff, #6ea8ff); box-shadow: 0 0 26px rgba(56,225,255,.55); }
.chips { display: flex; flex-wrap: wrap; gap: 8px; margin-bottom: 22px; }
.chip { padding: 5px 12px; border-radius: 4px; font-size: 12px; color: #bdeaff; border: 1px solid rgba(56,225,255,.35); background: rgba(56,225,255,.07); }
.grid { display: grid; grid-template-columns: 1fr 1fr; gap: 24px 34px; }
.tag { display: inline-flex; align-items: center; gap: 8px; padding: 5px 12px; margin: 0 6px 8px 0; border-radius: 4px; font-size: 12.5px; color: #c9f3ff; border: 1px solid rgba(56,225,255,.35); background: rgba(56,225,255,.08); }
.tag i { font-style: normal; font-size: 11px; color: #38e1ff; }
.tech { font-size: 12px; color: #38e1ff; letter-spacing: .06em; margin: 3px 0 8px; }
.cert { display: inline-block; padding: 5px 12px; margin: 0 6px 8px 0; font-size: 12px; color: #bdeaff; border: 1px dashed rgba(56,225,255,.4); }
.self { font-size: 13.5px; line-height: 1.85; color: #bfd9f2; }
</style></head><body><div class="page"><div class="card">
  <div class="head">
    <div><div class="name">${escapeHtml(b.name || '未填写姓名')}</div><div class="role">${escapeHtml(data.targetJob || data.intention.position || '')}</div></div>
    <span class="badge">SYSTEM · RESUME</span>
  </div>
  <div class="chips">${contactChips(data)}</div>
  <div class="grid">
    <div>
      ${section('求职意向', data.intention.position ? `<div class="item"><span class="t">${escapeHtml(str(data.intention.position))}</span><span class="muted">　${escapeHtml(str(data.intention.salary))} · ${escapeHtml(str(data.intention.city))}</span></div>` : '')}
      ${section('工作经历', workItems)}
      ${section('项目经历', projectItems)}
    </div>
    <div>
      ${section('技能特长', skillItems ? `<div>${skillItems}</div>` : '')}
      ${section('教育经历', eduItems)}
      ${section('证书资质', certItems ? `<div>${certItems}</div>` : '')}
      ${section('自我评价', data.self ? `<div class="self">${highlight(data.self, keywords)}</div>` : '')}
    </div>
  </div>
</div></div></body></html>`
}


/** 极客 · 终端：等宽字体 + 终端绿，命令行气息 */
function renderMono(data: ResumeData, keywords: Set<string>): string {
  const b = data.basic
  const workItems = data.work.map((w) => `<div class="item">
    <div class="row"><span class="t">${escapeHtml(str(w.position))} @ ${escapeHtml(str(w.company))}</span><span class="muted">${escapeHtml(fmtRange(str(w.start), str(w.end)))}</span></div>
    <ul>${bullets(w.content, keywords)}${bullets(w.achievement, keywords)}</ul>
  </div>`).join('')
  const projectItems = data.project.map((p) => `<div class="item">
    <div class="row"><span class="t">${escapeHtml(str(p.name))}</span><span class="muted">${escapeHtml(str(p.role))} · ${escapeHtml(fmtRange(str(p.start), str(p.end)))}</span></div>
    ${str(p.tech) ? `<div class="tech">$ { ${escapeHtml(str(p.tech))} }</div>` : ''}
    <ul>${bullets(p.desc, keywords)}${bullets(p.contribution, keywords)}</ul>
  </div>`).join('')
  const eduItems = data.education.map((e) => `<div class="item">
    <div class="row"><span class="t">${escapeHtml(str(e.school))}</span><span class="muted">${escapeHtml(fmtRange(str(e.start), str(e.end)))}</span></div>
    <div class="muted">${escapeHtml(str(e.major))}${str(e.degree) ? ' · ' + escapeHtml(str(e.degree)) : ''}</div>
  </div>`).join('')
  const skillItems = data.skills.map((s) => `<span class="tag">${escapeHtml(str(s.name))}</span>`).join('')
  const certItems = data.certificate.map((c) => `<div class="cert">${escapeHtml(str(c.name))} <span class="muted">${escapeHtml(str(c.org))}</span></div>`).join('')

  return `<!doctype html><html lang="zh-CN"><head><meta charset="utf-8"/>
<style>
:root { --accent: #22d3aa; }
* { box-sizing: border-box; margin: 0; padding: 0; }
body { font-family: 'Hanken Grotesk', 'Microsoft YaHei UI', system-ui, sans-serif; background: #04070c; color: #cfe6d8; }
h1, h2, h3, .t, .mono { font-family: ui-monospace, 'Cascadia Code', 'SF Mono', Consolas, 'Microsoft YaHei UI', monospace; }
.page { width: 794px; min-height: 1123px; margin: 0 auto; padding: 40px;
  background: linear-gradient(180deg, #05090f, #071018); }
.card { padding: 36px 42px; border: 1px solid rgba(34,211,170,.35); border-radius: 8px; background: rgba(8,16,24,.7); box-shadow: 0 0 40px rgba(34,211,170,.08); }
.head { padding-bottom: 16px; border-bottom: 1px dashed rgba(34,211,170,.4); margin-bottom: 24px; }
.name { font-size: 36px; font-weight: 700; color: #7ef0d0; letter-spacing: .04em; }
.name::before { content: '$> '; color: #22d3aa; }
.role { margin-top: 8px; color: #22d3aa; letter-spacing: .12em; font-size: 13px; }
.meta { display: flex; flex-wrap: wrap; gap: 12px; margin-top: 14px; color: #7f9aa6; font-size: 12px; font-family: ui-monospace, Consolas, monospace; }
.sec-title { font-size: 14px; font-weight: 700; color: #7ef0d0; margin-bottom: 12px; }
.sec-title::before { content: '// '; color: #22d3aa; }
ul { list-style: none; }
li { position: relative; padding-left: 18px; margin: 5px 0; line-height: 1.65; font-size: 13px; color: #b9d4c4; }
li::before { content: '>'; position: absolute; left: 0; color: #22d3aa; }
mark { background: rgba(34,211,170,.18); color: #9ff5d8; border-radius: 2px; padding: 0 2px; }
.grid { display: grid; grid-template-columns: 1fr 1fr; gap: 24px 36px; }
.item { margin-bottom: 16px; }
.row { display: flex; justify-content: space-between; gap: 10px; align-items: baseline; margin-bottom: 6px; }
.t { font-size: 14px; color: #e8fff4; }
.tech { font-size: 11.5px; color: #22d3aa; margin: 4px 0 8px; font-family: ui-monospace, Consolas, monospace; }
.tag { display: inline-block; padding: 4px 10px; margin: 0 6px 8px 0; font-size: 12px; color: #7ef0d0; border: 1px solid rgba(34,211,170,.4); background: rgba(34,211,170,.06); font-family: ui-monospace, Consolas, monospace; }
.cert { font-size: 13px; color: #b9d4c4; padding: 5px 0; }
.self { font-size: 13.5px; line-height: 1.85; color: #b9d4c4; }
.muted { color: #7f9aa6; }
</style></head><body><div class="page"><div class="card">
  <div class="head">
    <div class="name">${escapeHtml(b.name || '未填写姓名')}</div>
    <div class="role">${escapeHtml(data.targetJob || data.intention.position || '')}</div>
    <div class="meta">${[b.phone, b.email, b.city, b.years ? b.years + '经验' : '', b.degree, b.homepage].filter(Boolean).map((x) => `<span>${escapeHtml(x!)}</span>`).join('')}</div>
  </div>
  <div class="grid">
    <div>
      ${section('求职意向', data.intention.position ? `<div class="item"><span class="t">${escapeHtml(str(data.intention.position))}</span><span class="muted">　${escapeHtml(str(data.intention.salary))} · ${escapeHtml(str(data.intention.city))}</span></div>` : '')}
      ${section('工作经历', workItems)}
      ${section('项目经历', projectItems)}
    </div>
    <div>
      ${section('技能特长', skillItems ? `<div>${skillItems}</div>` : '')}
      ${section('教育经历', eduItems)}
      ${section('证书资质', certItems)}
      ${section('自我评价', data.self ? `<div class="self">${highlight(data.self, keywords)}</div>` : '')}
    </div>
  </div>
</div></div></body></html>`
}

/** 深海 · 渐变：蓝绿渐变 + 圆角卡片，清爽科技 */
function renderOcean(data: ResumeData, keywords: Set<string>): string {
  const b = data.basic
  const workItems = data.work.map((w) => `<div class="item">
    <div class="row"><span class="t">${escapeHtml(str(w.position))}</span><span class="muted">${escapeHtml(str(w.company))} · ${escapeHtml(fmtRange(str(w.start), str(w.end)))}</span></div>
    <ul>${bullets(w.content, keywords)}${bullets(w.achievement, keywords)}</ul>
  </div>`).join('')
  const projectItems = data.project.map((p) => `<div class="item">
    <div class="row"><span class="t">${escapeHtml(str(p.name))}</span><span class="muted">${escapeHtml(str(p.role))} · ${escapeHtml(fmtRange(str(p.start), str(p.end)))}</span></div>
    ${str(p.tech) ? `<div class="tech">${escapeHtml(str(p.tech))}</div>` : ''}
    <ul>${bullets(p.desc, keywords)}${bullets(p.contribution, keywords)}</ul>
  </div>`).join('')
  const eduItems = data.education.map((e) => `<div class="item">
    <div class="row"><span class="t">${escapeHtml(str(e.school))}</span><span class="muted">${escapeHtml(str(e.major))} · ${escapeHtml(fmtRange(str(e.start), str(e.end)))}</span></div>
  </div>`).join('')
  const skillItems = data.skills.map((s) => `<span class="tag">${escapeHtml(str(s.name))}<i>${escapeHtml(str(s.level))}</i></span>`).join('')
  const certItems = data.certificate.map((c) => `<div class="cert">${escapeHtml(str(c.name))} <span class="muted">${escapeHtml(str(c.org))}</span></div>`).join('')

  return `<!doctype html><html lang="zh-CN"><head><meta charset="utf-8"/>
<style>
:root { --accent: #2dd4bf; }
* { box-sizing: border-box; margin: 0; padding: 0; }
body { font-family: 'Hanken Grotesk', 'Microsoft YaHei UI', system-ui, sans-serif; }
.page { width: 794px; min-height: 1123px; margin: 0 auto; padding: 40px;
  background: linear-gradient(160deg, #0a2a43, #0f3d5c 45%, #0b2f52); }
.card { padding: 36px 42px; border-radius: 20px; background: rgba(255,255,255,.07); backdrop-filter: blur(10px); border: 1px solid rgba(255,255,255,.14); box-shadow: 0 24px 60px rgba(0,0,0,.4); }
.name { font-size: 42px; font-weight: 800; color: #f0fdff; letter-spacing: .02em; }
.role { margin-top: 8px; color: #2dd4bf; letter-spacing: .16em; font-size: 13.5px; }
.meta { display: flex; flex-wrap: wrap; gap: 10px; margin-top: 16px; }
.chip { padding: 5px 12px; border-radius: 999px; font-size: 12px; color: #d6f6ff; background: rgba(45,212,191,.14); border: 1px solid rgba(45,212,191,.35); }
.sec-title { display: flex; align-items: center; gap: 10px; font-size: 15px; font-weight: 700; color: #eafaff; margin-bottom: 12px; }
.sec-title::after { content: ''; flex: 1; height: 2px; border-radius: 2px; background: linear-gradient(90deg, rgba(45,212,191,.6), transparent); }
ul { list-style: none; }
li { position: relative; padding-left: 16px; margin: 5px 0; line-height: 1.65; font-size: 13px; color: #cfe9f2; }
li::before { content: ''; position: absolute; left: 2px; top: 8px; width: 5px; height: 5px; border-radius: 50%; background: #2dd4bf; box-shadow: 0 0 8px #2dd4bf; }
mark { background: rgba(45,212,191,.2); color: #a9f5e8; border-radius: 3px; padding: 0 2px; }
.grid { display: grid; grid-template-columns: 1fr 1fr; gap: 24px 36px; }
.item { margin-bottom: 16px; }
.row { display: flex; justify-content: space-between; gap: 10px; align-items: baseline; margin-bottom: 6px; }
.t { font-size: 14px; font-weight: 700; color: #eafaff; }
.tech { font-size: 12px; color: #2dd4bf; margin: 3px 0 8px; }
.tag { display: inline-flex; align-items: center; gap: 8px; padding: 5px 12px; margin: 0 6px 8px 0; border-radius: 999px; font-size: 12.5px; color: #d6f6ff; background: rgba(45,212,191,.12); border: 1px solid rgba(45,212,191,.35); }
.tag i { font-style: normal; font-size: 11px; color: #2dd4bf; }
.cert { font-size: 13px; color: #cfe9f2; padding: 5px 0; }
.self { font-size: 13.5px; line-height: 1.85; color: #cfe9f2; }
.muted { color: #9fc0cf; }
</style></head><body><div class="page"><div class="card">
  <div class="name">${escapeHtml(b.name || '未填写姓名')}</div>
  <div class="role">${escapeHtml(data.targetJob || data.intention.position || '')}</div>
  <div class="meta">${[b.phone, b.email, b.city, b.years ? b.years + '经验' : '', b.degree, b.homepage].filter(Boolean).map((x) => `<span class="chip">${escapeHtml(x!)}</span>`).join('')}</div>
  <div style="height: 18px;"></div>
  <div class="grid">
    <div>
      ${section('求职意向', data.intention.position ? `<div class="item"><span class="t">${escapeHtml(str(data.intention.position))}</span><span class="muted">　${escapeHtml(str(data.intention.salary))} · ${escapeHtml(str(data.intention.city))}</span></div>` : '')}
      ${section('工作经历', workItems)}
      ${section('项目经历', projectItems)}
    </div>
    <div>
      ${section('技能特长', skillItems ? `<div>${skillItems}</div>` : '')}
      ${section('教育经历', eduItems)}
      ${section('证书资质', certItems)}
      ${section('自我评价', data.self ? `<div class="self">${highlight(data.self, keywords)}</div>` : '')}
    </div>
  </div>
</div></div></body></html>`
}

/** 白纸 · 打印：白底黑字经典版，适合直接打印 */
function renderPaper(data: ResumeData, keywords: Set<string>): string {
  const b = data.basic
  const workItems = data.work.map((w) => `<div class="item">
    <div class="row"><span class="t">${escapeHtml(str(w.position))} · ${escapeHtml(str(w.company))}</span><span class="muted">${escapeHtml(fmtRange(str(w.start), str(w.end)))}</span></div>
    <ul>${bullets(w.content, keywords)}${bullets(w.achievement, keywords)}</ul>
  </div>`).join('')
  const projectItems = data.project.map((p) => `<div class="item">
    <div class="row"><span class="t">${escapeHtml(str(p.name))}</span><span class="muted">${escapeHtml(str(p.role))} · ${escapeHtml(fmtRange(str(p.start), str(p.end)))}</span></div>
    ${str(p.tech) ? `<div class="sub">${escapeHtml(str(p.tech))}</div>` : ''}
    <ul>${bullets(p.desc, keywords)}${bullets(p.contribution, keywords)}</ul>
  </div>`).join('')
  const eduItems = data.education.map((e) => `<div class="item">
    <div class="row"><span class="t">${escapeHtml(str(e.school))}</span><span class="muted">${escapeHtml(fmtRange(str(e.start), str(e.end)))}</span></div>
    <div class="sub">${escapeHtml(str(e.major))}${str(e.degree) ? ' · ' + escapeHtml(str(e.degree)) : ''}</div>
  </div>`).join('')
  const skillItems = data.skills.map((s) => `<span class="tag">${escapeHtml(str(s.name))}</span>`).join('')
  const certItems = data.certificate.map((c) => `<div class="cert">${escapeHtml(str(c.name))} <span class="muted">${escapeHtml(str(c.org))}</span></div>`).join('')

  return `<!doctype html><html lang="zh-CN"><head><meta charset="utf-8"/>
<style>
:root { --accent: #1e3a8a; }
* { box-sizing: border-box; margin: 0; padding: 0; }
body { font-family: 'Hanken Grotesk', 'Microsoft YaHei UI', system-ui, sans-serif; background: #ffffff; color: #1a1a1a; }
h1, h2, h3 { font-family: Georgia, 'Times New Roman', 'Songti SC', 'Microsoft YaHei UI', serif; }
.page { width: 794px; min-height: 1123px; margin: 0 auto; padding: 44px; }
.card { padding: 8px 4px; }
.name { font-size: 38px; font-weight: 700; color: #111827; letter-spacing: .02em; }
.role { margin-top: 8px; color: #1e3a8a; letter-spacing: .12em; font-size: 14px; font-weight: 600; }
.meta { display: flex; flex-wrap: wrap; gap: 8px 20px; margin-top: 14px; color: #4b5563; font-size: 12.5px; }
.sec-title { font-size: 15px; font-weight: 700; color: #111827; margin-bottom: 10px; padding-bottom: 6px; border-bottom: 2px solid #1e3a8a; }
ul { list-style: none; }
li { position: relative; padding-left: 16px; margin: 4px 0; line-height: 1.6; font-size: 13px; color: #374151; }
li::before { content: '•'; position: absolute; left: 2px; color: #1e3a8a; }
mark { background: #fef3c7; color: #111827; padding: 0 2px; }
.grid { display: grid; grid-template-columns: 1fr 1fr; gap: 20px 36px; }
.item { margin-bottom: 14px; }
.row { display: flex; justify-content: space-between; gap: 10px; align-items: baseline; margin-bottom: 4px; }
.t { font-size: 14px; font-weight: 700; color: #111827; }
.sub { font-size: 12.5px; color: #4b5563; margin: 2px 0 6px; }
.tag { display: inline-block; padding: 3px 10px; margin: 0 6px 8px 0; font-size: 12px; color: #1e3a8a; border: 1px solid #1e3a8a; border-radius: 2px; }
.cert { font-size: 13px; color: #374151; padding: 4px 0; }
.self { font-size: 13px; line-height: 1.8; color: #374151; }
.muted { color: #6b7280; }
</style></head><body><div class="page"><div class="card">
  <div class="name">${escapeHtml(b.name || '未填写姓名')}</div>
  <div class="role">${escapeHtml(data.targetJob || data.intention.position || '')}</div>
  <div class="meta">${[b.phone, b.email, b.city, b.years ? b.years + '经验' : '', b.degree, b.homepage].filter(Boolean).map((x) => `<span>${escapeHtml(x!)}</span>`).join('')}</div>
  <div style="height: 16px;"></div>
  <div class="grid">
    <div>
      ${section('求职意向', data.intention.position ? `<div class="item"><span class="t">${escapeHtml(str(data.intention.position))}</span><span class="muted">　${escapeHtml(str(data.intention.salary))} · ${escapeHtml(str(data.intention.city))}</span></div>` : '')}
      ${section('工作经历', workItems)}
      ${section('项目经历', projectItems)}
    </div>
    <div>
      ${section('技能特长', skillItems ? `<div>${skillItems}</div>` : '')}
      ${section('教育经历', eduItems)}
      ${section('证书资质', certItems)}
      ${section('自我评价', data.self ? `<div class="self">${highlight(data.self, keywords)}</div>` : '')}
    </div>
  </div>
</div></div></body></html>`
}

export function renderResume(style: string, data: ResumeData, keywords?: Set<string>): string {
  const kws = keywords ?? new Set<string>()
  if (style === 'minimal') return renderMinimal(data, kws)
  if (style === 'classic') return renderClassic(data, kws)
  if (style === 'royal') return renderRoyal(data, kws)
  if (style === 'holotech') return renderHolotech(data, kws)
  if (style === 'mono') return renderMono(data, kws)
  if (style === 'ocean') return renderOcean(data, kws)
  if (style === 'paper') return renderPaper(data, kws)
  return renderAurora(data, kws)
}