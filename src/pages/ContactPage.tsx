import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { useLanguage } from '../locales';
import { api } from '../services/api';
import {
  GlassSurface,
  GlassInput,
  GlassTextarea,
  GlassButton,
} from '../components/glass';
import {
  Mail,
  Phone,
  MapPin,
  Send,
  CheckCircle2,
  Instagram,
  AlertCircle,
} from 'lucide-react';

interface FieldErrors {
  name?: string;
  contact?: string;
  message?: string;
}

export const ContactPage: React.FC = () => {
  const { showToast } = useAuth();
  const { t } = useLanguage();
  const [name, setName] = useState('');
  const [contact, setContact] = useState('');
  const [subject, setSubject] = useState('');
  const [message, setMessage] = useState('');
  const [fieldErrors, setFieldErrors] = useState<FieldErrors>({});
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [submitted, setSubmitted] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitError(null);

    const nextErrors: FieldErrors = {};
    if (!name.trim()) nextErrors.name = t.contact.errRequired;
    if (!contact.trim()) nextErrors.contact = t.contact.errRequired;
    if (!message.trim()) nextErrors.message = t.contact.errRequired;

    if (Object.keys(nextErrors).length > 0) {
      setFieldErrors(nextErrors);
      showToast(t.contact.errRequired, 'error');
      return;
    }

    setFieldErrors({});
    setIsSubmitting(true);
    try {
      await api.submitContactMessage({
        name: name.trim(),
        contact: contact.trim(),
        subject: subject.trim() || t.contact.subjectOptions[0],
        message: message.trim(),
      });
      setSubmitted(true);
      showToast(t.contact.toastSuccess, 'success');
    } catch {
      setSubmitError(t.contact.errSubmit);
      showToast(t.contact.errSubmit, 'error');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="pt-28 pb-20 min-h-screen">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-12">
        <div className="text-center max-w-2xl mx-auto space-y-3">
          <GlassSurface
            variant="tinted-pink"
            rounded="full"
            className="inline-flex items-center px-3.5 py-1"
          >
            <span className="text-xs font-bold uppercase tracking-widest text-[#9E3E60]">
              {t.contact.script}
            </span>
          </GlassSurface>
          <h1 className="font-playfair text-4xl sm:text-5xl font-extrabold text-[#1E1418]">
            {t.contact.title}
          </h1>
          <p className="text-sm text-[#4A383F] leading-relaxed">{t.contact.subtitle}</p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 lg:gap-10">
          {/* Contact Details */}
          <div className="lg:col-span-5 space-y-6">
            <GlassSurface variant="elevated" rounded="3xl" className="p-6 sm:p-7 space-y-5">
              <h2 className="font-playfair text-xl font-bold text-[#1E1418]">
                {t.contact.directTitle}
              </h2>

              <div className="space-y-4 text-xs">
                <div className="flex items-start gap-3.5">
                  <div className="w-10 h-10 rounded-2xl bg-[#F5EBDD] flex items-center justify-center text-[#8D6829] shrink-0 border border-white">
                    <Phone className="w-4 h-4" aria-hidden="true" />
                  </div>
                  <div className="min-w-0">
                    <span className="text-[10px] uppercase font-bold text-[#5C4F48] block">
                      {t.contact.phoneLabel}
                    </span>
                    <a
                      href="tel:+998933223580"
                      className="font-bold text-[#1E1418] hover:text-[#C94F79] transition-colors mt-0.5 block"
                    >
                      +998 93 322 35 80
                    </a>
                    <p className="text-[#5C4F48]">{t.contact.hoursValue}</p>
                  </div>
                </div>

                <div className="flex items-start gap-3.5">
                  <div className="w-10 h-10 rounded-2xl bg-[#F5C9D8]/60 flex items-center justify-center text-[#C94F79] shrink-0 border border-white">
                    <Send className="w-4 h-4" aria-hidden="true" />
                  </div>
                  <div className="min-w-0">
                    <span className="text-[10px] uppercase font-bold text-[#5C4F48] block">
                      {t.contact.telegramLabel}
                    </span>
                    <a
                      href="https://t.me/taklifim_support"
                      target="_blank"
                      rel="noreferrer"
                      className="font-bold text-[#1E1418] hover:text-[#C94F79] transition-colors mt-0.5 block"
                    >
                      @taklifim_support
                    </a>
                    <p className="text-[#5C4F48]">{t.contact.telegramSub}</p>
                  </div>
                </div>

                <div className="flex items-start gap-3.5">
                  <div className="w-10 h-10 rounded-2xl bg-[#B9DFFA]/65 flex items-center justify-center text-[#1E3A5F] shrink-0 border border-white">
                    <Mail className="w-4 h-4" aria-hidden="true" />
                  </div>
                  <div className="min-w-0">
                    <span className="text-[10px] uppercase font-bold text-[#5C4F48] block">
                      {t.contact.emailLabel}
                    </span>
                    <a
                      href="mailto:info@taklifim.uz"
                      className="font-bold text-[#1E1418] hover:text-[#C94F79] transition-colors mt-0.5 block"
                    >
                      info@taklifim.uz
                    </a>
                    <p className="text-[#5C4F48]">{t.contact.emailSub}</p>
                  </div>
                </div>

                <div className="flex items-start gap-3.5">
                  <div className="w-10 h-10 rounded-2xl bg-[#F5EBDD] flex items-center justify-center text-[#8D6829] shrink-0 border border-white">
                    <MapPin className="w-4 h-4" aria-hidden="true" />
                  </div>
                  <div className="min-w-0">
                    <span className="text-[10px] uppercase font-bold text-[#5C4F48] block">
                      {t.contact.officeLabel}
                    </span>
                    <p className="font-bold text-[#1E1418] mt-0.5">{t.contact.officeValue}</p>
                    <p className="text-[#5C4F48]">{t.contact.countryLabel}</p>
                  </div>
                </div>
              </div>
            </GlassSurface>

            {/* Social channels card */}
            <GlassSurface
              variant="default"
              rounded="3xl"
              className="p-5 flex items-center justify-between gap-3"
            >
              <div className="min-w-0">
                <h3 className="text-xs font-bold text-[#1E1418]">{t.contact.socialTitle}</h3>
                <p className="text-[11px] text-[#5C4F48]">{t.contact.socialDesc}</p>
              </div>
              <div className="flex items-center gap-2 shrink-0">
                <a
                  href="https://instagram.com"
                  target="_blank"
                  rel="noreferrer"
                  className="w-11 h-11 rounded-2xl glass-surface-subtle flex items-center justify-center text-[#1E1418] hover:text-[#C94F79] hover:bg-white transition-colors"
                  aria-label={t.contact.instagramLabel}
                >
                  <Instagram className="w-4 h-4" aria-hidden="true" />
                </a>
                <a
                  href="https://t.me"
                  target="_blank"
                  rel="noreferrer"
                  className="w-11 h-11 rounded-2xl glass-surface-subtle flex items-center justify-center text-[#1E1418] hover:text-[#2B6EA3] hover:bg-white transition-colors"
                  aria-label={t.contact.telegramLabel}
                >
                  <Send className="w-4 h-4" aria-hidden="true" />
                </a>
              </div>
            </GlassSurface>
          </div>

          {/* Contact Form */}
          <div className="lg:col-span-7">
            <GlassSurface variant="elevated" rounded="3xl" className="p-6 sm:p-8">
              {submitted ? (
                <div className="py-12 text-center space-y-4 animate-fadeIn">
                  <div className="w-16 h-16 rounded-full bg-emerald-100 text-emerald-700 mx-auto flex items-center justify-center border border-white shadow-sm">
                    <CheckCircle2 className="w-8 h-8" aria-hidden="true" />
                  </div>
                  <h2 className="font-playfair text-2xl font-bold text-[#1E1418]">
                    {t.contact.successTitle}
                  </h2>
                  <p className="text-xs sm:text-sm text-[#4A383F] max-w-md mx-auto leading-relaxed">
                    {t.contact.successDesc}
                  </p>
                  <div className="pt-2 flex justify-center">
                    <GlassButton
                      tone="tinted"
                      size="md"
                      onClick={() => {
                        setSubmitted(false);
                        setName('');
                        setContact('');
                        setSubject('');
                        setMessage('');
                        setFieldErrors({});
                        setSubmitError(null);
                      }}
                    >
                      {t.contact.newMessageBtn}
                    </GlassButton>
                  </div>
                </div>
              ) : (
                <form noValidate onSubmit={handleSubmit} className="space-y-4">
                  <h2 className="font-playfair text-xl font-bold text-[#1E1418] mb-2">
                    {t.contact.formTitle}
                  </h2>

                  {submitError && (
                    <GlassSurface
                      variant="tinted-pink"
                      rounded="2xl"
                      className="p-3.5 flex items-center gap-2.5 border border-rose-300/80 text-xs font-semibold text-rose-800"
                      role="alert"
                    >
                      <AlertCircle className="w-4 h-4 shrink-0" aria-hidden="true" />
                      <span>{submitError}</span>
                    </GlassSurface>
                  )}

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <GlassInput
                      type="text"
                      required
                      label={t.contact.nameLabel}
                      value={name}
                      error={fieldErrors.name}
                      onChange={(e) => {
                        setName(e.target.value);
                        if (fieldErrors.name) setFieldErrors((prev) => ({ ...prev, name: undefined }));
                      }}
                      placeholder={t.contact.namePlaceholder}
                    />

                    <GlassInput
                      type="text"
                      required
                      label={t.contact.contactFieldLabel}
                      value={contact}
                      error={fieldErrors.contact}
                      onChange={(e) => {
                        setContact(e.target.value);
                        if (fieldErrors.contact) {
                          setFieldErrors((prev) => ({ ...prev, contact: undefined }));
                        }
                      }}
                      placeholder={t.contact.contactFieldPlaceholder}
                    />
                  </div>

                  <GlassInput
                    type="text"
                    label={t.contact.subjectLabel}
                    value={subject}
                    onChange={(e) => setSubject(e.target.value)}
                    placeholder={t.contact.subjectPlaceholder}
                  />

                  <GlassTextarea
                    required
                    rows={5}
                    label={t.contact.messageLabel}
                    value={message}
                    error={fieldErrors.message}
                    onChange={(e) => {
                      setMessage(e.target.value);
                      if (fieldErrors.message) {
                        setFieldErrors((prev) => ({ ...prev, message: undefined }));
                      }
                    }}
                    placeholder={t.contact.messagePlaceholder}
                  />

                  <div className="pt-1">
                    <GlassButton
                      type="submit"
                      tone="tinted"
                      size="lg"
                      loading={isSubmitting}
                      leftIcon={<Send className="w-4 h-4" aria-hidden="true" />}
                      className="w-full justify-center"
                    >
                      {isSubmitting ? t.contact.sendingBtn : t.contact.sendBtn}
                    </GlassButton>
                  </div>
                </form>
              )}
            </GlassSurface>
          </div>
        </div>
      </div>
    </div>
  );
};
