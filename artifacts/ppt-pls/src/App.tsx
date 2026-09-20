import { type FormEvent, type ReactNode, useEffect, useMemo, useState } from 'react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { ArrowRight, BookOpen, Check, ChevronDown, Clock3, FileText, LoaderCircle, Mail, Menu, RefreshCw, ShieldCheck, Sparkles, X } from 'lucide-react';
import { Link, Route, Switch, Router as WouterRouter, useLocation } from 'wouter';
import { ErrorBoundary } from '@/components/error-boundary';
import { Toaster } from '@/components/ui/toaster';
import { TooltipProvider } from '@/components/ui/tooltip';
import { getGetCatalogQueryKey, useCreateCheckout, useCreateOrder, useGetCatalog } from '@workspace/api-client-react';
import type { Catalog, OrderInput, SubjectGroup } from '@workspace/api-client-react';
import NotFound from '@/pages/not-found';

const queryClient = new QueryClient();
type Currency = 'USD' | 'INR';
type DeliveryMode = 'standard' | 'personalized';

const currencySymbols: Record<Currency, string> = { USD: '$', INR: '₹' };

function Header() {
  const [open, setOpen] = useState(false);
  return (
    <header className="relative z-20 border-b border-[hsl(var(--primary)/.14)] bg-[hsl(var(--primary))] text-[hsl(var(--primary-foreground))]">
      <div className="mx-auto flex max-w-7xl items-center justify-between px-5 py-5 lg:px-10">
        <Link href="/" className="group flex items-center gap-3" data-testid="link-home">
          <span className="grid h-9 w-9 place-items-center rounded-full border border-[hsl(var(--secondary)/.65)] text-[hsl(var(--secondary))] transition-transform duration-300 group-hover:rotate-6">
            <span className="font-editorial text-2xl leading-none">p</span>
          </span>
          <span className="text-[15px] font-semibold tracking-[-.03em]">PPT pls</span>
        </Link>
        <nav className="hidden items-center gap-8 text-[13px] text-[hsl(var(--primary-foreground)/.68)] md:flex">
          <a href="#how-it-works" className="transition-colors hover:text-[hsl(var(--secondary))]" data-testid="link-how-it-works">How it works</a>
          <a href="#promise" className="transition-colors hover:text-[hsl(var(--secondary))]" data-testid="link-promise">Our promise</a>
          <a href="#order" className="rounded-full border border-[hsl(var(--secondary)/.55)] px-4 py-2 text-[hsl(var(--secondary))] transition-colors hover:bg-[hsl(var(--secondary))] hover:text-[hsl(var(--primary))]" data-testid="link-start-order">Start an order</a>
        </nav>
        <button type="button" onClick={() => setOpen(!open)} className="md:hidden" aria-label="Toggle navigation" data-testid="button-toggle-navigation">
          {open ? <X size={19} /> : <Menu size={19} />}
        </button>
      </div>
      {open && (
        <nav className="grid gap-4 border-t border-[hsl(var(--primary-foreground)/.12)] px-5 py-5 text-sm md:hidden">
          <a href="#how-it-works" onClick={() => setOpen(false)} data-testid="mobile-link-how-it-works">How it works</a>
          <a href="#promise" onClick={() => setOpen(false)} data-testid="mobile-link-promise">Our promise</a>
          <a href="#order" onClick={() => setOpen(false)} className="text-[hsl(var(--secondary))]" data-testid="mobile-link-start-order">Start an order</a>
        </nav>
      )}
    </header>
  );
}

function CatalogSkeleton() {
  return (
    <div className="space-y-5" aria-label="Loading catalogue" data-testid="loading-catalog">
      <div className="h-4 w-28 animate-pulse rounded bg-[hsl(var(--muted))]" />
      <div className="h-12 animate-pulse rounded-xl bg-[hsl(var(--muted))]" />
      <div className="h-4 w-24 animate-pulse rounded bg-[hsl(var(--muted))]" />
      <div className="h-12 animate-pulse rounded-xl bg-[hsl(var(--muted))]" />
      <div className="grid grid-cols-3 gap-2"><div className="h-16 animate-pulse rounded-xl bg-[hsl(var(--muted))]" /><div className="h-16 animate-pulse rounded-xl bg-[hsl(var(--muted))]" /><div className="h-16 animate-pulse rounded-xl bg-[hsl(var(--muted))]" /></div>
    </div>
  );
}

function FieldLabel({ children, hint }: { children: ReactNode; hint?: string }) {
  return <div className="mb-2 flex items-baseline justify-between gap-3"><label className="text-[11px] font-semibold uppercase tracking-[.13em] text-[hsl(var(--primary)/.72)]">{children}</label>{hint && <span className="text-[11px] text-[hsl(var(--muted-foreground))]">{hint}</span>}</div>;
}

function PriceLine({ amount, currency }: { amount?: number; currency: Currency }) {
  if (typeof amount !== 'number') return <span>—</span>;
  return <span>{currencySymbols[currency]}{amount.toLocaleString(currency === 'INR' ? 'en-IN' : 'en-US')}</span>;
}

function OrderPanel({ catalog }: { catalog: Catalog }) {
  const groups = catalog.groups ?? [];
  const currencies = (catalog.currencies ?? []).filter((value): value is Currency => ['USD', 'INR'].includes(value));
  const [subjectGroupId, setSubjectGroupId] = useState(groups[0]?.id ?? '');
  const [subject, setSubject] = useState('');
  const [slideRange, setSlideRange] = useState('');
  const [currency, setCurrency] = useState<Currency>((currencies[0] ?? 'USD') as Currency);
  const [deliveryMode, setDeliveryMode] = useState<DeliveryMode>('standard');
  const [topic, setTopic] = useState('');
  const [instructions, setInstructions] = useState('');
  const [email, setEmail] = useState('');
  const [notice, setNotice] = useState<{ type: 'error' | 'fallback'; title: string; body: string } | null>(null);
  const [createdOrderId, setCreatedOrderId] = useState('');
  const createOrder = useCreateOrder();
  const createCheckout = useCreateCheckout();

  const selectedGroup = useMemo<SubjectGroup | undefined>(() => groups.find((group) => group.id === subjectGroupId), [groups, subjectGroupId]);
  const prices = selectedGroup?.prices ?? [];
  const selectedPrice = prices.find((price) => price.slides === slideRange) ?? prices[0];

  useEffect(() => {
    if (!subjectGroupId && groups[0]) setSubjectGroupId(groups[0].id);
  }, [groups, subjectGroupId]);
  useEffect(() => {
    setSubject(selectedGroup?.subjects[0] ?? '');
    setSlideRange(selectedGroup?.prices?.[0]?.slides ?? '');
  }, [selectedGroup]);

  const isSubmitting = createOrder.isPending || createCheckout.isPending;
  const submitLabel = createOrder.isPending ? 'Saving your brief' : createCheckout.isPending ? 'Opening secure checkout' : 'Continue to secure payment';

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setNotice(null);
    const orderInput: OrderInput = {
      email,
      subjectGroup: subjectGroupId,
      subject,
      slideRange,
      topic,
      ...(instructions.trim() ? { instructions: instructions.trim() } : {}),
      deliveryMode,
      currency,
    };
    createOrder.mutate({ data: orderInput }, {
      onSuccess: (order) => {
        setCreatedOrderId(order.id);
        createCheckout.mutate({ data: { orderId: order.id, currency } }, {
          onSuccess: (checkout) => {
            if (checkout.purchaseUrl) {
              window.location.href = checkout.purchaseUrl;
              return;
            }
            setNotice({ type: 'fallback', title: 'Your brief is saved.', body: 'The hosted payment link is not available right now. You can send the brief to our studio by email and we will reply with the next step.' });
          },
          onError: () => setNotice({ type: 'fallback', title: 'Your brief is saved.', body: 'We could not open hosted payment at the moment. Use the email option below so your request is not lost.' }),
        });
      },
      onError: () => setNotice({ type: 'error', title: 'We could not save that brief.', body: 'Please check your connection and try again. Your details are still on this page.' }),
    });
  }

  const mailto = `mailto:hello@pptpls.studio?subject=${encodeURIComponent(`PPT pls request${createdOrderId ? ` ${createdOrderId}` : ''}`)}&body=${encodeURIComponent(`Topic: ${topic}\nSubject: ${subject}\nSlides: ${slideRange}\nService: ${deliveryMode}\nEmail: ${email}\n\n${instructions}`)}`;

  return (
    <section id="order" className="relative scroll-mt-10 bg-[hsl(var(--card))] px-5 py-16 sm:px-8 lg:px-10 lg:py-24">
      <div className="mx-auto grid max-w-7xl gap-10 lg:grid-cols-[minmax(0,1fr)_390px] lg:gap-20">
        <div className="max-w-2xl">
          <div className="mb-8 flex items-center gap-3 text-[11px] font-semibold uppercase tracking-[.16em] text-[hsl(var(--accent))]"><span className="h-px w-8 bg-[hsl(var(--accent))]" />Build your brief</div>
          <h2 className="font-editorial text-5xl leading-[.95] tracking-[-.035em] text-[hsl(var(--primary))] sm:text-6xl">Tell us what you need<br /><em className="text-[hsl(var(--accent))]">to present well.</em></h2>
          <p className="mt-6 max-w-lg text-[15px] leading-7 text-[hsl(var(--muted-foreground))]">A few considered details give our studio the right context. We handle the structure, the visual logic, and the last-mile polish.</p>
          <div className="mt-10 hidden border-l border-[hsl(var(--accent)/.4)] pl-5 text-sm leading-6 text-[hsl(var(--primary)/.68)] sm:block"><span className="font-editorial text-xl italic text-[hsl(var(--accent))]">“</span> Clear thinking deserves a clear deck.<br /><span className="ml-5 text-[11px] uppercase tracking-[.12em]">The PPT pls standard</span></div>
        </div>

        <div className="relative">
          <div className="absolute -inset-3 rounded-[1.4rem] bg-[hsl(var(--secondary)/.1)] blur-xl" />
          <form onSubmit={handleSubmit} className="relative rounded-2xl border border-[hsl(var(--border))] bg-[hsl(var(--background))] p-5 shadow-[var(--shadow-md)] sm:p-7" data-testid="form-order">
            <div className="mb-7 flex items-center justify-between border-b border-[hsl(var(--border))] pb-5">
              <div><p className="font-mono-ui text-[10px] uppercase tracking-[.14em] text-[hsl(var(--accent))]">01 / 04</p><p className="mt-1 text-sm font-semibold text-[hsl(var(--primary))]">Presentation brief</p></div>
              <span className="rounded-full bg-[hsl(var(--secondary)/.16)] px-3 py-1 text-[10px] font-semibold uppercase tracking-[.1em] text-[hsl(var(--primary))]">~ 2 min</span>
            </div>

            <div className="space-y-5">
              <div><FieldLabel>Subject group</FieldLabel><div className="relative"><select required value={subjectGroupId} onChange={(event) => setSubjectGroupId(event.target.value)} className="form-select" data-testid="select-subject-group">{groups.map((group) => <option value={group.id} key={group.id}>{group.label}</option>)}</select><ChevronDown className="pointer-events-none absolute right-4 top-3.5 text-[hsl(var(--muted-foreground))]" size={16} /></div>{selectedGroup?.description && <p className="mt-2 text-xs leading-5 text-[hsl(var(--muted-foreground))]">{selectedGroup.description}</p>}</div>
              <div><FieldLabel>Subject</FieldLabel><div className="relative"><select required value={subject} onChange={(event) => setSubject(event.target.value)} className="form-select" data-testid="select-subject">{(selectedGroup?.subjects ?? []).map((item) => <option value={item} key={item}>{item}</option>)}</select><ChevronDown className="pointer-events-none absolute right-4 top-3.5 text-[hsl(var(--muted-foreground))]" size={16} /></div></div>
              <div><FieldLabel hint="Choose your depth">Slide count</FieldLabel><div className="grid grid-cols-3 gap-2">{prices.map((price) => <button type="button" key={price.id} onClick={() => setSlideRange(price.slides)} className={`choice-tile ${selectedPrice?.id === price.id ? 'choice-tile-active' : ''}`} data-testid={`button-slide-range-${price.id}`}><span className="block text-sm font-semibold">{price.slides}</span><span className="mt-1 block text-[10px] text-[hsl(var(--muted-foreground))]"><PriceLine amount={price[currency.toLowerCase() as 'usd' | 'inr']} currency={currency} /></span></button>)}</div></div>
              <div><FieldLabel>Delivery preference</FieldLabel><div className="grid gap-2 sm:grid-cols-2">{(['standard', 'personalized'] as DeliveryMode[]).map((mode) => <button type="button" key={mode} onClick={() => setDeliveryMode(mode)} className={`mode-tile ${deliveryMode === mode ? 'mode-tile-active' : ''}`} data-testid={`button-delivery-${mode}`}><span className="flex items-center gap-2 text-sm font-semibold">{deliveryMode === mode ? <Check size={14} /> : <span className="h-3.5 w-3.5 rounded-full border border-current opacity-40" />}{mode === 'standard' ? 'Standard' : 'Personalized'}</span><span className="mt-1 block pl-5 text-[11px] leading-4 text-[hsl(var(--muted-foreground))]">{mode === 'standard' ? 'Clear, polished, on brief' : 'More direction, more refinement'}</span></button>)}</div></div>
              <div><FieldLabel hint="At least 3 characters">Topic</FieldLabel><input required minLength={3} value={topic} onChange={(event) => setTopic(event.target.value)} placeholder="e.g. Acute kidney injury" className="form-input" data-testid="input-topic" /></div>
              <div><FieldLabel hint="Optional">Requirements or source material</FieldLabel><textarea value={instructions} onChange={(event) => setInstructions(event.target.value)} placeholder="Audience, learning objectives, references, tone..." rows={3} className="form-input resize-none" data-testid="textarea-instructions" /></div>
              <div><FieldLabel>Delivery email</FieldLabel><input required type="email" value={email} onChange={(event) => setEmail(event.target.value)} placeholder="you@university.edu" className="form-input" data-testid="input-email" /></div>
              <div><FieldLabel>Currency</FieldLabel><div className="flex gap-2">{currencies.map((item) => <button type="button" key={item} onClick={() => setCurrency(item)} className={`currency-pill ${currency === item ? 'currency-pill-active' : ''}`} data-testid={`button-currency-${item}`}>{item}</button>)}</div></div>
            </div>

            <div className="mt-7 border-t border-[hsl(var(--border))] pt-5">
              <div className="mb-4 flex items-end justify-between"><div><p className="text-[11px] uppercase tracking-[.13em] text-[hsl(var(--muted-foreground))]">Estimated total</p><p className="mt-1 font-editorial text-3xl text-[hsl(var(--primary))]"><PriceLine amount={selectedPrice?.[currency.toLowerCase() as 'usd' | 'inr']} currency={currency} /></p></div><p className="max-w-[135px] text-right text-[11px] leading-4 text-[hsl(var(--muted-foreground))]">Final delivery timing is confirmed after your brief.</p></div>
              {notice && <div className={`mb-4 rounded-xl border p-4 ${notice.type === 'error' ? 'border-[hsl(var(--destructive)/.35)] bg-[hsl(var(--destructive)/.06)]' : 'border-[hsl(var(--accent)/.4)] bg-[hsl(var(--accent)/.08)]'}`} data-testid={`status-${notice.type}`}><p className="text-sm font-semibold text-[hsl(var(--primary))]">{notice.title}</p><p className="mt-1 text-xs leading-5 text-[hsl(var(--muted-foreground))]">{notice.body}</p>{notice.type === 'fallback' && <a href={mailto} className="mt-3 inline-flex items-center gap-2 text-xs font-semibold text-[hsl(var(--accent))] underline-offset-4 hover:underline" data-testid="link-email-fallback"><Mail size={13} /> Email the studio instead <ArrowRight size={13} /></a>}</div>}
              <button disabled={isSubmitting} type="submit" className="primary-button w-full" data-testid="button-submit-order">{isSubmitting ? <><LoaderCircle className="animate-spin" size={16} />{submitLabel}</> : <>{submitLabel}<ArrowRight size={16} /></>}</button>
              <p className="mt-3 flex items-center justify-center gap-1.5 text-center text-[10px] text-[hsl(var(--muted-foreground))]"><ShieldCheck size={12} className="text-[hsl(var(--secondary-foreground))]" /> You will review your brief before payment</p>
            </div>
          </form>
        </div>
      </div>
    </section>
  );
}

function Home() {
  const catalogQuery = useGetCatalog({ query: { staleTime: 300000, queryKey: getGetCatalogQueryKey() } });
  return (
    <div className="site-shell min-h-[100dvh] bg-[hsl(var(--background))]">
      <Header />
      <main>
        <section className="relative overflow-hidden bg-[hsl(var(--primary))] px-5 pb-20 pt-16 text-[hsl(var(--primary-foreground))] sm:px-8 sm:pb-28 sm:pt-24 lg:px-10">
          <div className="absolute right-[-8%] top-[-18%] h-[540px] w-[540px] rounded-full border border-[hsl(var(--secondary)/.15)] sm:h-[720px] sm:w-[720px]" /><div className="absolute right-[8%] top-[12%] h-[310px] w-[310px] rounded-full border border-[hsl(var(--accent)/.18)]" />
          <div className="relative mx-auto grid max-w-7xl gap-14 lg:grid-cols-[1.1fr_.9fr] lg:items-end">
            <div className="max-w-3xl">
              <div className="fade-up mb-8 flex items-center gap-3 font-mono-ui text-[10px] uppercase tracking-[.19em] text-[hsl(var(--secondary))]"><span className="h-1.5 w-1.5 rounded-full bg-[hsl(var(--secondary))]" /> Academic presentation studio <span className="ml-1 h-px w-12 bg-[hsl(var(--secondary)/.45)]" /></div>
              <h1 className="fade-up delay-1 font-editorial text-[clamp(4rem,10vw,8.7rem)] leading-[.82] tracking-[-.055em]">A better<br /><em className="text-[hsl(var(--secondary))]">last minute.</em></h1>
              <p className="fade-up delay-2 mt-9 max-w-xl text-[16px] leading-7 text-[hsl(var(--primary-foreground)/.7)] sm:text-lg">You bring the topic and the deadline. We bring the clinical clarity, editorial eye, and a deck you can present without apology.</p>
              <a href="#order" className="fade-up delay-3 mt-9 inline-flex items-center gap-3 rounded-full bg-[hsl(var(--secondary))] px-5 py-3.5 text-[13px] font-semibold text-[hsl(var(--primary))] transition-transform hover:-translate-y-0.5" data-testid="link-hero-start-order">Start with your topic <ArrowRight size={16} /></a>
            </div>
            <div className="fade-up delay-3 lg:pb-2"><div className="ml-auto max-w-xs border-l border-[hsl(var(--secondary)/.35)] pl-5"><p className="font-editorial text-2xl leading-tight text-[hsl(var(--primary-foreground)/.9)]">For the morning after the all-nighter.</p><p className="mt-4 text-[11px] uppercase tracking-[.13em] text-[hsl(var(--primary-foreground)/.5)]">Order in minutes · present with confidence</p></div></div>
          </div>
        </section>

        <section id="how-it-works" className="paper-grid border-b border-[hsl(var(--border))] bg-[hsl(var(--card))] px-5 py-14 sm:px-8 lg:px-10">
          <div className="mx-auto grid max-w-7xl gap-8 md:grid-cols-3 md:gap-0">
            {[
              { n: '01', icon: <BookOpen size={18} />, title: 'Give us the brief', body: 'Choose your subject, slide count, and the one thing your audience must remember.' },
              { n: '02', icon: <Sparkles size={18} />, title: 'We shape the story', body: 'Our studio turns clinical material into a clean, coherent visual argument.' },
              { n: '03', icon: <FileText size={18} />, title: 'You present ready', body: 'A deck arrives in your inbox with the polish and pacing your room deserves.' },
            ].map((item, index) => <div key={item.n} className={`fade-up delay-${index + 1} relative border-[hsl(var(--border))] md:px-8 ${index < 2 ? 'md:border-r' : ''} ${index === 0 ? 'md:pl-0' : ''}`}><div className="flex items-center justify-between text-[hsl(var(--accent))]"><span className="font-mono-ui text-[10px] tracking-[.16em]">{item.n}</span>{item.icon}</div><h3 className="mt-5 font-editorial text-2xl text-[hsl(var(--primary))]">{item.title}</h3><p className="mt-2 max-w-xs text-sm leading-6 text-[hsl(var(--muted-foreground))]">{item.body}</p></div>)}
          </div>
        </section>

        {catalogQuery.isLoading && <section className="px-5 py-16 sm:px-8 lg:px-10"><div className="mx-auto max-w-7xl"><CatalogSkeleton /></div></section>}
        {catalogQuery.isError && <section className="px-5 py-20 sm:px-8 lg:px-10"><div className="mx-auto max-w-xl rounded-2xl border border-[hsl(var(--border))] bg-[hsl(var(--card))] p-8 text-center" data-testid="status-catalog-error"><div className="mx-auto grid h-12 w-12 place-items-center rounded-full bg-[hsl(var(--muted))] text-[hsl(var(--accent))]"><RefreshCw size={20} /></div><h2 className="mt-5 font-editorial text-3xl text-[hsl(var(--primary))]">The studio desk is momentarily offline.</h2><p className="mt-3 text-sm leading-6 text-[hsl(var(--muted-foreground))]">Your deadline is not. Try the catalogue again and we will get you moving.</p><button type="button" onClick={() => catalogQuery.refetch()} className="secondary-button mt-6" data-testid="button-retry-catalog">Try again <RefreshCw size={14} /></button></div></section>}
        {catalogQuery.data && <OrderPanel catalog={catalogQuery.data} />}

        <section id="promise" className="bg-[hsl(var(--secondary))] px-5 py-16 text-[hsl(var(--primary))] sm:px-8 lg:px-10 lg:py-24">
          <div className="mx-auto grid max-w-7xl gap-10 lg:grid-cols-[.8fr_1.2fr] lg:items-center"><div><p className="font-mono-ui text-[10px] uppercase tracking-[.17em] opacity-70">The studio promise</p><h2 className="mt-5 max-w-md font-editorial text-5xl leading-[.93] tracking-[-.035em] sm:text-6xl">Quietly serious about your deadline.</h2></div><div className="grid max-w-xl gap-6 sm:grid-cols-2"><div className="border-t border-[hsl(var(--primary)/.25)] pt-4"><Clock3 size={19} /><p className="mt-5 text-sm font-semibold">Deadline-aware</p><p className="mt-2 text-sm leading-6 opacity-70">We respect the clock without making the work feel rushed.</p></div><div className="border-t border-[hsl(var(--primary)/.25)] pt-4"><ShieldCheck size={19} /><p className="mt-5 text-sm font-semibold">Clinically considered</p><p className="mt-2 text-sm leading-6 opacity-70">Clear hierarchy, accurate language, and nothing decorative without purpose.</p></div></div></div>
        </section>
      </main>
      <footer className="bg-[hsl(var(--primary))] px-5 py-7 text-[hsl(var(--primary-foreground)/.62)] sm:px-8 lg:px-10"><div className="mx-auto flex max-w-7xl flex-col gap-3 text-[11px] sm:flex-row sm:items-center sm:justify-between"><span className="font-semibold tracking-[-.02em] text-[hsl(var(--primary-foreground))]">PPT pls</span><span>Presentation support for the clinically curious.</span><a href="mailto:hello@pptpls.studio" className="transition-colors hover:text-[hsl(var(--secondary))]" data-testid="link-footer-email">hello@pptpls.studio</a></div></footer>
    </div>
  );
}

function Success() {
  const [location] = useLocation();
  const orderId = new URLSearchParams(location.split('?')[1] ?? '').get('order');
  return (
    <div className="site-shell min-h-[100dvh] bg-[hsl(var(--primary))] text-[hsl(var(--primary-foreground))]"><Header /><main className="mx-auto flex min-h-[calc(100dvh-78px)] max-w-3xl items-center px-5 py-16 sm:px-8"><div className="w-full"><div className="draw-in mx-auto grid h-16 w-16 place-items-center rounded-full border border-[hsl(var(--secondary)/.65)] text-[hsl(var(--secondary))]"><Check size={28} strokeWidth={1.5} /></div><div className="fade-up delay-1 mt-8 text-center"><p className="font-mono-ui text-[10px] uppercase tracking-[.18em] text-[hsl(var(--secondary))]">Brief received</p><h1 className="mt-5 font-editorial text-6xl leading-[.9] tracking-[-.045em] sm:text-8xl">You’re in<br /><em className="text-[hsl(var(--secondary))]">good hands.</em></h1><p className="mx-auto mt-7 max-w-md text-[15px] leading-7 text-[hsl(var(--primary-foreground)/.68)]">Your request is with the studio. We will send the next update to your delivery email as soon as your deck is underway.</p>{orderId && <p className="mt-7 font-mono-ui text-[10px] uppercase tracking-[.13em] text-[hsl(var(--primary-foreground)/.45)]" data-testid="text-order-id">Reference {orderId}</p>}<Link href="/" className="secondary-button mt-10 border-[hsl(var(--secondary)/.6)] bg-transparent text-[hsl(var(--secondary))] hover:bg-[hsl(var(--secondary))] hover:text-[hsl(var(--primary))]" data-testid="link-return-home">Return to PPT pls <ArrowRight size={15} /></Link></div></div></main></div>
  );
}

function RoutedErrorBoundary({ children }: { children: ReactNode }) {
  const [location] = useLocation();
  return <ErrorBoundary resetKey={location}>{children}</ErrorBoundary>;
}

function Router() {
  return <RoutedErrorBoundary><Switch><Route path="/" component={Home} /><Route path="/success" component={Success} /><Route component={NotFound} /></Switch></RoutedErrorBoundary>;
}

function App() {
  return <QueryClientProvider client={queryClient}><TooltipProvider><WouterRouter base={import.meta.env.BASE_URL.replace(/\/$/, '')}><Router /></WouterRouter><Toaster /></TooltipProvider></QueryClientProvider>;
}

export default App;