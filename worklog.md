# Worklog

---
Task ID: 1-8 (single orchestrator run — cohesive client-side build, no subagents needed)
Agent: Z.ai Code (orchestrator, direct implementation)
Task: ساخت «دنگ‌حساب» — اپ کلاینت‌بیس فارسی (Rtl) برای حساب دنگ‌های دورهمی: تعریف اعضا بدون لاگین، ثبت هزینه با پرداخت‌کننده و سهیم‌ها، تقسیم مساوی/دلخواه، و تسویه با کمترین تعداد واریز؛ ذخیره‌سازی روی مرورگر (localStorage) و آماده‌ی دپلوی استاتیک روی Netlify (بدون بک‌اند، طبق درخواست کاربر).

Work Log:
- بررسی ساختار پروژه (package.json، next.config.ts، globals.css، components/ui، dev server روی پورت 3000).
- تغییر معماری از فول‌استک (Prisma/API) به کلاینت‌بیس خالص بعد از درخواست کاربر: حذف src/app/api، حذف طرح استفاده از دیتابیس.
- کانفیگ Netlify: next.config.ts با output: "export" + images.unoptimized، اسکریپت build به «next build»، اسکریپت start به serve استاتیک، فایل netlify.toml (command=npm run build، publish=out، NODE_VERSION=22).
- هسته محاسباتی خالص در src/lib/dang/settlement.ts: splitEqually (توزیع باقی‌مانده تومانی یکی‌یکی به نفرات اول)، computeBalances (paid-owed)، computeTransfers (الگوریتم حریصانه: بزرگ‌ترین بدهکار ↔ بزرگ‌ترین بستانکار، حداکثر n-1 تراکنش).
- src/lib/dang/types.ts (Member/Expense/ExpenseParticipant/Transfer + سقف‌ها)، utils.ts (uid، normalizeName با یکسان‌سازی ی/ک عربی)، format.ts (ارقام فارسی/عربی→انگلیسی، parseAmount، formatMoney با fa-IR، تاریخ شمسی).
- ذخیره‌سازی: src/lib/dang/store.ts — zustand + persist روی localStorage (کلید dang-hesab-v1، skipHydration برای جلوگیری از mismatch سرور/کلاینت + هوک useDangHydrated)، اکشن‌های addMember/removeMember/addExpense/removeExpense/replaceAll/resetAll با اعتبارسنجی کامل و پیام‌های فارسی.
- پشتیبان‌گیری: src/lib/dang/backup.ts — buildBackup/downloadBackup (JSON) + validateBackup سخت‌گیرانه (بررسی app/version/شناسه‌ها/تکراری‌نبودن/جمع سهم‌ها = مبلغ).
- UI فارسی RTL با shadcn/ui و تم زمردی (بدون آبی/نیلی): layout.tsx با lang=fa dir=rtl، فونت Vazirmatn (next/font/google)، ThemeProvider (next-themes)، Toaster (sonner)؛ globals.css با پالت oklch زمردی روشن/تاریک و اسکرول‌بار سفارشی؛ آیکون app/icon.svg.
- کامپوننت‌ها در src/components/dang: dang-app (هدر sticky + کارت‌های خلاصه + تب‌ها با forceMount برای حفظ state فرم + فوتر چسبان mt-auto)، expense-form (فرم کامل با Select پرداخت‌کننده، چیپ‌های سهیم با همه/هیچ‌کدوم، تقسیم مساوی/دلخواه با پیش‌نمایش زنده و اعتبارسنجی جمع)، expense-list (کارت‌ها با تاریخ شمسی، چیپ سهم‌ها، حذف با AlertDialog)، members-panel (خوش‌آمد + افزودن/حذف عضو + وضعیت هر نفر + پشتیبان‌گیری/بازیابی/ریست)، settlement-panel (وضعیت حساب‌ها + کارت‌های تراکنش «کی به کی چقدر بزنه» + دکمه کپی پیام برای گروه)، money-input (فرمت زنده ارقام فارسی)، theme-toggle، summary-cards.
- رفع باگ: ExpenseList اسم‌ها را از payerName/p.name (فیلدهای حذف‌شده مدل سروری) می‌خواند → resolve از Map اعضا با nameOf.
- رفع خطاهای lint (react-hooks/set-state-in-effect): فرم با state مشتق‌شده (بدون effect)، تب پیش‌فرض با الگوی رسمی setState هنگام render.
- تست منطق با bun -e (بدون فایل تست): سناریوی دست‌حساب‌شده ۴ نفر/۵ هزینه — بالانس‌ها (علی +۴۹۱٬۶۶۶، سارا −۸۳٬۳۳۳، رضا −۲۵۸٬۳۳۳، مریم −۱۵۰٬۰۰۰)، جمع بالانس‌ها صفر، ۳ تراکنش بهینه (رضا→علی ۲۵۸٬۳۳۳، مریم→علی ۱۵۰٬۰۰۰، سارا→علی ۸۳٬۳۳۳)، باقی‌مانده تقسیم (۳۳٬۳۳۴/۳۳٬۳۳۳/۳۳٬۳۳۳)، اعتبارسنجی backup (۷ حالت) — همه PASSED.
- E2E با agent-browser: رندر اولیه/تب پیش‌فرض اعضا، افزودن ۴ عضو، رد عضو تکراری، ثبت ۵ هزینه (مساوی/باقی‌مانده/دلخواه)، پیش‌نمایش سهم، حذف هزینه با تأیید و محاسبه مجدد، سلکت پرداخت‌کننده، کارت‌های خلاصه دقیق، تراکنش‌های تسویه دقیقاً مطابق دست، کپی پیام، بلاک ثبت با جمع ناهماهنگ، بلاک حذف عضوِ استفاده‌شده، حذف عضو آزاد، تم روشن/تاریک، پایداری داده بعد از reload، فوتر چسبان در صفحه کوتاه/بلند، ریسپانسیو 390px، بدون خطای کنسول، دانلود پشتیبان.
- QA بصری با VLM روی اسکرین‌شات موبایل و دارک‌مود: RTL، کنتراست، تراز کارت‌ها تأیید شد.
- lint نهایی پاس، dev.log بدون خطا/هشدار.

Stage Summary:
- محصول: اپ تک‌صفحه‌ای «دنگ‌حساب» کاملاً کلاینت‌بیس (بدون هیچ API/سرور) با ذخیره‌سازی localStorage + پشتیبان‌گیری/بازیابی JSON.
- فایل‌های کلیدی: src/lib/dang/{types,utils,format,settlement,store,backup}.ts و src/components/dang/*.tsx و netlify.toml و next.config.ts (output: "export").
- دپلوی Netlify: `npm run build` → پوشه out → publish=out (netlify.toml تنظیم شده)؛ یا Netlify Drop با پوشه out.
- نکته: داده‌ها per-browser هستند؛ انتقال بین دستگاه‌ها فقط با فایل پشتیبان.
- همه تست‌های محاسباتی و E2E پاس شده‌اند؛ اعداد نمایش‌داده‌شده در UI با محاسبه دستی تطبیق داده شد.
