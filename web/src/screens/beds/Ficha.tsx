/* Ficha do paciente (rota ficha?id=&volta=&de=gaso): identificação, dados para os cálculos (gravados nas mesmas chaves
   que as calculadoras leem: peso, idade, sexo, altura, cr, crBase, pamAlvo), internação, comorbidades, alergias, dispositivos. */
import { useEffect, useState } from 'react';
import { Button, Input, Label, TextField, toast } from '@heroui/react';
import { TriangleAlert } from 'lucide-react';
import { C } from '@/lib/calc';
import { navigate } from '@/lib/router';
import { TopBar, Page } from '@/components/Shell';
import { Grid, NumField, Ref, SegField, Section, fieldError } from '@/components/ui';
import { avulso, emptyFicha, extraFilled, FICHA_LIM, FICHA_NUMS, G, nextTipo, P, pfCalc, readNum, recs, today, type Ficha as FichaT } from '@/lib/beds';
import { findTool } from '@/tools/registry';
import { Chips } from './parts';
import { S } from './session';

function Txt({ label, value, onChange, optional, placeholder, maxLength, upper, numeric, type, hint, max }: { label: string; value: string; onChange: (v: string) => void; optional?: boolean; placeholder?: string; maxLength?: number; upper?: boolean; numeric?: boolean; type?: string; hint?: string; max?: string }) {
  return (
    <TextField value={value} onChange={onChange} fullWidth>
      <Label className="text-[13.5px] font-medium">{label}{optional && <span className="font-normal text-muted"> (opcional)</span>}</Label>
      <Input type={type || 'text'} placeholder={placeholder} maxLength={maxLength} max={max} autoComplete="off" autoCorrect="off" spellCheck={false} autoCapitalize={upper ? 'characters' : 'off'} inputMode={numeric ? 'numeric' : undefined} className="h-13 text-[17px]" />
      {hint && <p className="text-xs text-muted">{hint}</p>}
    </TextField>
  );
}

export function Ficha({ query }: { query: URLSearchParams }) {
  const qid = query.get('id');
  const ed = qid ? P.get(qid) : null;
  const deGaso = query.get('de') === 'gaso' && !!S.quick;
  const volta = query.get('volta');
  useEffect(() => { if (qid && !ed) navigate('#/leitos', true); }, [qid, ed]);
  const d0 = ed ? ed.data || {} : deGaso ? avulso() : {};
  const f0: FichaT = (ed && ed.ficha) || emptyFicha();
  const [bed, setBed] = useState(ed ? C.ptBed(ed) : '');
  const [ini, setIni] = useState(ed ? C.ptIni(ed) : '');
  const [atd, setAtd] = useState(ed ? (ed.tipo === 'atd' ? ed.label : f0.atd || '') : '');
  const [sexo, setSexo] = useState(d0.sexo || '');
  const [nums, setNums] = useState<Record<string, string>>(() => Object.fromEntries(FICHA_NUMS.map((k) => [k, d0[k] || ''])));
  const [adm, setAdm] = useState(f0.adm || '');
  const [iso, setIso] = useState(f0.iso || '');
  const [diag, setDiag] = useState(f0.diag || '');
  const [com, setCom] = useState<string[]>(f0.com || []);
  const [alerg, setAlerg] = useState(f0.alerg || '');
  const [dev, setDev] = useState<string[]>(f0.dev || []);
  const [obs, setObs] = useState(f0.obs || '');
  const [msg, setMsg] = useState('');
  if (qid && !ed) return null;
  const setNum = (k: string, v: string) => setNums((n) => ({ ...n, [k]: v }));
  const bits = pfCalc(readNum(nums.altura, FICHA_LIM.altura), readNum(nums.peso, FICHA_LIM.peso), sexo);
  const back = ed ? '#/paciente?id=' + ed.id : deGaso ? '#/gaso?rec=' + S.quick!.id : volta ? '#/' + volta : '#/leitos';

  function save() {
    const b = bed.trim(), i = ini.trim().toUpperCase(), at = atd.trim();
    if (!b && !i && !at) return setMsg('Preencha o leito, as iniciais ou o atendimento.');
    for (const k of FICHA_NUMS) if (nums[k].trim() && fieldError(nums[k], FICHA_LIM[k])) return setMsg('Corrija os campos em vermelho.');
    let p = ed;
    if (!p) {
      const tipo = nextTipo(null, b, i, at), label = b || i || at;
      const dup = P.find(tipo, label);
      if (dup && !dup.archived) return setMsg(`${P.name(dup)} já está na lista — edite a ficha dele.`);
      p = P.add(tipo, label);
    } else {
      const tipo = nextTipo(ed!.tipo, b, i, at);
      p.tipo = tipo; p.label = tipo === 'leito' ? b : tipo === 'ini' ? i : at;
    }
    p.data = p.data || {};
    for (const k of FICHA_NUMS) { const v = nums[k].trim(); if (v) p.data[k] = v; else delete p.data[k]; }
    if (sexo) p.data.sexo = sexo; else delete p.data.sexo;
    p.ficha = {
      leito: p.tipo !== 'leito' ? b : '', ini: p.tipo !== 'ini' ? i : '', atd: p.tipo !== 'atd' ? at : '',
      adm: adm.trim(), iso: iso || '', diag: diag.trim(), alerg: alerg.trim(), obs: obs.trim(), com, dev,
    };
    p.records = recs(p);
    if (deGaso) {
      const qr = S.quick!;
      p.records.push(qr); S.quick = null; S.ctx = null;
      P.touch(p); P.setActive(p.id);
      toast(`Gasometria salva em ${P.name(p)}`);
      return navigate(`#/gaso?id=${p.id}&rec=${qr.id}`);
    }
    P.touch(p);
    if (!ed) P.setActive(p.id);
    toast(ed ? 'Ficha salva' : `${P.name(p)} admitido e selecionado`);
    navigate(volta && findTool(volta) ? '#/' + volta : '#/paciente?id=' + p.id);
  }

  return (
    <>
      <TopBar kicker={ed ? P.name(ed) : 'Novo paciente'} title={ed ? 'Ficha do paciente' : 'Admitir paciente'} />
      <Page>
        <Section title="Identificação" aux="ao menos um" className="mt-2">
          <Grid>
            <Txt label="Leito" value={bed} onChange={setBed} maxLength={12} placeholder="ex.: 12" />
            <Txt label="Iniciais" value={ini} onChange={(v) => setIni(v.toUpperCase())} maxLength={8} placeholder="ex.: JSM" upper />
          </Grid>
          <div className="mt-3"><Txt label="Nº do atendimento" value={atd} onChange={setAtd} maxLength={24} optional numeric /></div>
          <p className="mt-2 text-xs text-muted">Evite nome completo.</p>
        </Section>
        <Section title="Dados para os cálculos" aux="usados em todas as calculadoras" className="mt-3">
          <SegField label="Sexo" value={sexo} onChange={setSexo} options={[{ value: 'M', label: 'Masculino' }, { value: 'F', label: 'Feminino' }]} />
          <Grid cols={3} className="mt-3">
            <NumField label="Idade" unit="anos" value={nums.idade} onChange={(v) => setNum('idade', v)} lim={FICHA_LIM.idade} />
            <NumField label="Altura" unit="cm" value={nums.altura} onChange={(v) => setNum('altura', v)} lim={FICHA_LIM.altura} />
            <NumField label="Peso" unit="kg" value={nums.peso} onChange={(v) => setNum('peso', v)} lim={FICHA_LIM.peso} />
          </Grid>
          <div className="mt-2 flex flex-wrap gap-x-4 gap-y-1 font-mono text-[12px] text-muted">
            {bits.length ? bits.map(([k, v]) => <span key={k}>{k} <b className="text-foreground">{v}</b></span>) : <span>altura + sexo → peso predito e Vt protetor</span>}
          </div>
          <Grid cols={3} className="mt-3">
            <NumField label="Cr atual" unit="mg/dL" value={nums.cr} onChange={(v) => setNum('cr', v)} lim={FICHA_LIM.cr} />
            <NumField label="Cr basal" unit="mg/dL" value={nums.crBase} onChange={(v) => setNum('crBase', v)} lim={FICHA_LIM.crBase} />
            <NumField label="PAM alvo" unit="mmHg" value={nums.pamAlvo} onChange={(v) => setNum('pamAlvo', v)} lim={FICHA_LIM.pamAlvo} placeholder="65" />
          </Grid>
          <p className="mt-2 text-xs text-muted">Cr basal entra no KDIGO; PAM alvo substitui o 65 padrão nos alertas (ex.: hipertenso crônico).</p>
        </Section>
        <details className="mt-3 rounded-2xl border border-border bg-surface" open={!!ed && extraFilled(f0)}>
          <summary className="flex min-h-14 cursor-pointer items-center gap-2 px-4"><b className="flex-1 text-[15.5px] font-semibold">Internação, comorbidades, alergias e dispositivos</b><span className="text-xs text-muted">opcional</span></summary>
          <div className="flex flex-col gap-4 border-t border-separator px-4 pb-4 pt-3">
            <Grid><Txt label="Admissão na UTI" value={adm} onChange={setAdm} type="date" max={today()} /><div /></Grid>
            <SegField label="Isolamento" value={iso} onChange={setIso} options={G.ISO.map(([k, l]) => ({ value: k, label: l }))} />
            <Txt label="Diagnóstico / motivo da internação" value={diag} onChange={setDiag} maxLength={70} placeholder="ex.: choque séptico, foco pulmonar" />
            <Chips label="Comorbidades" options={G.COM} value={com} onChange={setCom} />
            <Txt label="Alergias" value={alerg} onChange={setAlerg} maxLength={80} placeholder="vazio = não informado · escreva NEGA se negar" />
            <Chips label="Dispositivos" options={G.DEV} value={dev} onChange={setDev} />
            <label className="flex flex-col gap-1.5"><span className="text-[13.5px] font-medium">Observações</span>
              <textarea value={obs} onChange={(e) => setObs(e.target.value)} maxLength={500} rows={3} placeholder="pendências, metas do dia…" className="w-full rounded-xl border border-border bg-field px-3.5 py-2.5 text-[16px] outline-none focus:border-accent" /></label>
          </div>
        </details>
        <Ref><TriangleAlert className="mr-1 inline size-3.5" />LGPD: não registre nome, prontuário, CPF nem data de nascimento.</Ref>
        {msg && <p role="alert" className="mt-2 text-sm font-medium text-danger">{msg}</p>}
        <div className="mt-3 grid grid-cols-[auto_1fr] gap-2">
          <Button variant="secondary" size="lg" onPress={() => navigate(back)}>Cancelar</Button>
          <Button size="lg" onPress={save}>{ed ? 'Salvar ficha' : deGaso ? 'Admitir e salvar a gasometria' : 'Admitir paciente'}</Button>
        </div>
      </Page>
    </>
  );
}
