"use client";

import React, { useState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import TipTapEditor from "@/components/TipTapEditor";
import { ReleaseNotesWidget } from "@/components/ReleaseNotesWidget";

type MembershipPlan = {
  id: string;
  name: string;
  description: string | null;
  cost: number;
  isArchived: boolean;
};

type Court = {
  id: string;
  name: string;
  openTime: number | null;
  closeTime: number | null;
};

type EmailTemplate = {
  id: string;
  subject: string;
  htmlBody: string;
};

type BookingType = {
  id: string;
  name: string;
  color: string;
  isBuiltIn: boolean;
  allowMemberRegistration: boolean;
  minParticipants: number | null;
  maxParticipants: number | null;
  defaultCost: number | null;
};

type CouponCode = {
  id: string;
  code: string;
  discountType: 'PERCENT' | 'FIXED';
  discountAmount: number;
  description: string | null;
  maxUses: number | null;
  currentUses: number;
  expiryDate: string | null;
  validForMemberships: boolean;
  validEvents: { id: string; title: string }[];
};

type CustomPage = {
  id: string;
  slug: string;
  title: string;
  contentHtml: string;
  isPublished: boolean;
  isPublic: boolean;
};

const TEMPLATE_VARIABLES: Record<string, string[]> = {
  WELCOME_EMAIL: [
    "{{firstName}}",
    "{{memberNumber}}",
    "{{clubName}}",
    "{{loginLink}}",
  ],
  REGISTRATION_PENDING: [
    "{{memberNames}}",
    "{{totalDue}}",
    "{{paymentEmail}}",
    "{{editUrl}}",
  ],
  PROFILE_UPDATED: ["{{changesHtml}}"],
  BOOKING_CONFIRMATION: [
    "{{actionTitle}}",
    "{{actionText}}",
    "{{courtName}}",
    "{{formattedStart}}",
    "{{formattedEnd}}",
    "{{type}}",
    "{{title}}",
    "{{description}}",
    "{{participantNames}}",
    "{{bookedBy}}",
    "{{formattedBookedAt}}",
    "{{portalLink}}",
  ],
  INTEREST_CONFIRMATION: [
    "{{firstName}}",
    "{{clubName}}",
    "{{clubShortName}}",
    "{{registerLink}}",
  ],
  ADMIN_NEW_REGISTRATION: [
    "{{memberNames}}",
    "{{totalDue}}",
    "{{adminDashboardLink}}",
  ],
  IMPORT_WELCOME_EMAIL: ["{{firstName}}", "{{clubName}}", "{{resetUrl}}"],
};

const MOCK_VARIABLES: Record<string, string> = {
  "{{firstName}}": "Jane",
  "{{memberNumber}}": "MEM-7890",
  "{{clubName}}": "Springfield Tennis Club",
  "{{loginLink}}": "https://example.com/login",
  "{{memberNames}}": "Jane Doe, John Doe, Timmy Doe",
  "{{totalDue}}": "200.00",
  "{{paymentEmail}}": "payments@springfieldtennis.com",
  "{{editUrl}}": "https://example.com/register?edit=123",
  "{{changesHtml}}": "<li>Phone updated to 555-0192</li>",
  "{{actionTitle}}": "Confirmed",
  "{{actionText}}": "Your court booking has been confirmed.",
  "{{courtName}}": "Court 1",
  "{{formattedStart}}": "Fri, Jun 5, 9:00 AM",
  "{{formattedEnd}}": "10:30 AM",
  "{{type}}": "MEMBER",
  "{{title}}": "Morning Hit",
  "{{description}}": "Practice session",
  "{{participantNames}}": "Jane Doe, Alice Smith",
  "{{bookedBy}}": "Jane Doe",
  "{{formattedBookedAt}}": "Thu, Jun 4, 2:00 PM",
  "{{portalLink}}": "https://example.com/portal",
  "{{clubShortName}}": "STC",
  "{{registerLink}}": "https://example.com/register",
  "{{adminDashboardLink}}": "https://example.com/admin",
  "{{resetUrl}}": "https://example.com/reset-password",
};

const DEFAULT_TEMPLATES: Record<string, { subject: string; htmlBody: string }> =
  {
    WELCOME_EMAIL: {
      subject: "Welcome to the {{clubName}}!",
      htmlBody:
        '\n    <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">\n      <h2 style="color: #4f46e5;">Welcome to the {{clubName}}!</h2>\n      <p>Hi {{firstName}},</p>\n      <p>Great news! Your club membership has been approved and activated.</p>\n      <p>Your official Member Number is: <strong>{{memberNumber}}</strong></p>\n      <p>You can now log into the Member Portal to view your status, update your contact details, and book tennis courts!</p>\n      <a href="{{loginLink}}" style="display: inline-block; padding: 12px 24px; margin: 20px 0; background-color: #4f46e5; color: white; text-decoration: none; border-radius: 6px; font-weight: bold;">Log In to Member Portal</a>\n      <p>If you haven\'t set a password yet, simply click the "Forgot your password?" link on the login page.</p>\n      <p>See you on the courts!</p>\n    </div>\n  ',
    },
    REGISTRATION_PENDING: {
      subject: "Your Registration Details & Edit Link",
      htmlBody:
        '<b>Thank you for registering!</b><br><p>Your registration is now pending approval. Here are your registration details:</p><ul><li><b>Registered Members:</b> {{memberNames}}</li><li><b>Total Amount Due:</b> $\\{{totalDue}}</li></ul><p>Send your membership payment (ensure you include your first and last name in the message) via Etransfer to <strong>{{paymentEmail}}</strong>.<br/>\n<strong>NOTE</strong>: Your membership is not complete until payment is received.  Once your membership registration and payment have been verified, you will receive an email with the lock code to the entrance gates along with other Club information including shoe tag arrangements.</p><p>You can edit your household registration at any time using this link:</p><p><a href="{{editUrl}}">{{editUrl}}</a></p>',
    },
    PROFILE_UPDATED: {
      subject: "Your Club Registration Details Were Updated",
      htmlBody:
        "<b>Your registration details were recently updated by an administrator.</b><br><br><p>Here are the changes:</p><ul>{{changesHtml}}</ul>",
    },
    BOOKING_CONFIRMATION: {
      subject: "Court Booking {{actionTitle}}",
      htmlBody:
        '\n    <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">\n      <h2 style="color: #4f46e5;">Court Booking {{actionTitle}}</h2>\n      <p>{{actionText}}</p>\n      <div style="background-color: #f3f4f6; padding: 15px; border-radius: 6px; margin: 20px 0;">\n        <p style="margin: 5px 0;"><strong>Court:</strong> {{courtName}}</p>\n        <p style="margin: 5px 0;"><strong>Time:</strong> {{formattedStart}} to {{formattedEnd}}</p>\n        <p style="margin: 5px 0;"><strong>Type:</strong> {{type}}</p>\n        <p style="margin: 5px 0;"><strong>Players:</strong> {{participantNames}}</p>\n        <p style="margin: 5px 0; margin-top: 10px; padding-top: 10px; border-top: 1px solid #e5e7eb;"><strong>Booked By:</strong> {{bookedBy}} on {{formattedBookedAt}}</p>\n      </div>\n      <p><a href="{{portalLink}}" style="color: #4f46e5;">Manage your bookings in the Member Portal</a></p>\n    </div>\n  ',
    },
    INTEREST_CONFIRMATION: {
      subject: "Thanks for your interest in {{clubName}}!",
      htmlBody:
        '\n    <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">\n      <h2 style="color: #4f46e5;">Thanks for your interest in {{clubName}}!</h2>\n      <p>Hi {{firstName}},</p>\n      <p>We\'ve received your information and are thrilled you\'re interested in joining our Club.</p>\n      <p>We hope you make {{clubShortName}} your home this season, and together we will continue to build upon a great tradition of excellence.</p>\n      <p>If you\'re ready to take the next step and officially register your household, you can do so at any time using the link below:</p>\n      <a href="{{registerLink}}" style="display: inline-block; padding: 12px 24px; margin: 20px 0; background-color: #4f46e5; color: white; text-decoration: none; border-radius: 6px; font-weight: bold;">Register for the Club</a>\n      <p>We look forward to seeing you on the courts!</p>\n    </div>\n  ',
    },
    ADMIN_NEW_REGISTRATION: {
      subject: "New Registration - Pending Approval",
      htmlBody:
        '\n    <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">\n      <h2 style="color: #4f46e5;">New Club Registration!</h2>\n      <p>A new household has submitted a registration and is pending approval.</p>\n      <div style="background-color: #f3f4f6; padding: 15px; border-radius: 6px; margin: 20px 0;">\n        <p style="margin: 5px 0;"><strong>Registered Members:</strong> {{memberNames}}</p>\n        <p style="margin: 5px 0;"><strong>Total Amount Due:</strong> $\\{{totalDue}}</p>\n      </div>\n      <p>Please review the registration and payment status in the Admin Dashboard:</p>\n      <a href="{{adminDashboardLink}}" style="display: inline-block; padding: 12px 24px; margin: 20px 0; background-color: #4f46e5; color: white; text-decoration: none; border-radius: 6px; font-weight: bold;">Go to Admin Dashboard</a>\n    </div>\n  ',
    },
    IMPORT_WELCOME_EMAIL: {
      subject: "Welcome to the Club Portal!",
      htmlBody:
        '\n    <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">\n      <h2 style="color: #4f46e5;">Welcome to the new {{clubName}} Portal!</h2>\n      <p>Hi {{firstName}},</p>\n      <p>We\'ve launched a new Member Portal for the upcoming season, and your account is ready to go!</p>\n      <p>Click the link below to securely set your password and access your account:</p>\n      <a href="{{resetUrl}}" style="display: inline-block; padding: 12px 24px; margin: 20px 0; background-color: #4f46e5; color: white; text-decoration: none; border-radius: 6px; font-weight: bold;">Set Password & Log In</a>\n      <p>Once logged in, you can update your profile, view your membership status, and book courts.</p>\n      <p>See you on the courts!</p>\n    </div>\n  ',
    },
  };

export default function AdminSettingsPage() {
  const [cutoffMinutes, setCutoffMinutes] = useState(90);
  const [maxHoursPerDay, setMaxHoursPerDay] = useState(2);
  const [maxDaysInAdvance, setMaxDaysInAdvance] = useState(3);
  const [calendarDaysToShow, setCalendarDaysToShow] = useState(3);
  const [calendarSkipDays, setCalendarSkipDays] = useState(1);
  const [primaryColor, setPrimaryColor] = useState("#4f46e5");
  const [secondaryColor, setSecondaryColor] = useState("#10b981");
  const [fontFamily, setFontFamily] = useState("Inter");
  const [heroImageUrl, setHeroImageUrl] = useState("");
  const [promoImageUrl, setPromoImageUrl] = useState("");
  const [promoLinkUrl, setPromoLinkUrl] = useState("");
  const [externalWebsiteUrl, setExternalWebsiteUrl] = useState("");
  const [logoUrl, setLogoUrl] = useState("");
  const [isSuperAdmin, setIsSuperAdmin] = useState(false);
  const [courtOpenTime, setCourtOpenTime] = useState(6);
  const [courtCloseTime, setCourtCloseTime] = useState(23);
  const [activeSeason, setActiveSeason] = useState("2026");
  const [enableCsvImport, setEnableCsvImport] = useState(true);
  const [enableWelcomeEmails, setEnableWelcomeEmails] = useState(true);
  const [enableMemberCourtBooking, setEnableMemberCourtBooking] = useState(true);
  const [simpleLandingPage, setSimpleLandingPage] = useState(false);
  const [enableQrCheckIn, setEnableQrCheckIn] = useState(false);
  const [requireGpsCheckIn, setRequireGpsCheckIn] = useState(false);
  const [clubLatitude, setClubLatitude] = useState("");
  const [clubLongitude, setClubLongitude] = useState("");
  const [genderOptions, setGenderOptions] = useState(
    "Male, Female, Prefer not to say",
  );
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [wiping, setWiping] = useState(false);
  const [wipingSystem, setWipingSystem] = useState(false);
  const [message, setMessage] = useState("");

  const [heroTitle, setHeroTitle] = useState("Elevate Your Game at");
  const [heroSubtitle, setHeroSubtitle] = useState("Experience premier tennis facilities, professional coaching, and a vibrant community of players of all levels.");
  const [feature1Title, setFeature1Title] = useState("Pristine Courts");
  const [feature1Desc, setFeature1Desc] = useState("Play on our perfectly maintained surfaces. Easy online booking ensures your court is ready when you are.");
  const [feature2Title, setFeature2Title] = useState("Expert Coaching");
  const [feature2Desc, setFeature2Desc] = useState("Elevate your skills with our certified professionals offering group clinics and private lessons.");
  const [feature3Title, setFeature3Title] = useState("Vibrant Community");
  const [feature3Desc, setFeature3Desc] = useState("Join tournaments, ladders, and social events. Find playing partners easily through our member portal.");

  const [plans, setPlans] = useState<MembershipPlan[]>([]);
  const [plansLoading, setPlansLoading] = useState(true);

  // For adding a new plan
  const [newPlan, setNewPlan] = useState({
    name: "",
    description: "",
    cost: 0,
  });
  const [savingPlan, setSavingPlan] = useState(false);

  // For editing an existing plan
  const [editingPlanId, setEditingPlanId] = useState<string | null>(null);
  const [editPlanForm, setEditPlanForm] = useState<Partial<MembershipPlan>>({});

  const [courts, setCourts] = useState<Court[]>([]);
  const [courtsLoading, setCourtsLoading] = useState(true);
  const [newCourt, setNewCourt] = useState({
    name: "",
    openTime: "",
    closeTime: "",
  });
  const [editingCourtId, setEditingCourtId] = useState<string | null>(null);
  const [showAddCourt, setShowAddCourt] = useState(false);
  const [showAddPlan, setShowAddPlan] = useState(false);
  const [showAddBookingType, setShowAddBookingType] = useState(false);
  const [editCourtForm, setEditCourtForm] = useState<Partial<Court>>({});

  const [emailTemplates, setEmailTemplates] = useState<EmailTemplate[]>([]);
  const [selectedTemplateId, setSelectedTemplateId] = useState<string>("");
  const [editTemplateForm, setEditTemplateForm] = useState<
    Partial<EmailTemplate>
  >({});
  const [savingTemplate, setSavingTemplate] = useState(false);

  const [bookingTypes, setBookingTypes] = useState<BookingType[]>([]);
  const [bookingTypesLoading, setBookingTypesLoading] = useState(true);
  const [newBookingType, setNewBookingType] = useState({ 
    name: "", 
    color: "#8b5cf6",
    allowMemberRegistration: false,
    minParticipants: "",
    maxParticipants: "",
    defaultCost: ""
  });
  const [editingBookingTypeId, setEditingBookingTypeId] = useState<string | null>(null);
  const [editBookingTypeForm, setEditBookingTypeForm] = useState<{
    id?: string;
    name?: string;
    color?: string;
    isBuiltIn?: boolean;
    allowMemberRegistration?: boolean;
    minParticipants?: string;
    maxParticipants?: string;
    defaultCost?: string;
  }>({});
  const [savingBookingType, setSavingBookingType] = useState(false);

  const [coupons, setCoupons] = useState<CouponCode[]>([]);
  const [couponsLoading, setCouponsLoading] = useState(true);
  const [editingCouponId, setEditingCouponId] = useState<string | null>(null);
  const [couponFormData, setCouponFormData] = useState({
    code: '',
    discountType: 'PERCENT' as 'PERCENT' | 'FIXED',
    discountAmount: '',
    description: '',
    maxUses: '',
    expiryDate: '',
    validForMemberships: false
  });
  const [showAddCoupon, setShowAddCoupon] = useState(false);
  const [savingCoupon, setSavingCoupon] = useState(false);

  const [customPages, setCustomPages] = useState<CustomPage[]>([]);
  const [pagesLoading, setPagesLoading] = useState(true);
  const [showAddPage, setShowAddPage] = useState(false);
  const [editingPageId, setEditingPageId] = useState<string | null>(null);
  const [pageForm, setPageForm] = useState<Partial<CustomPage>>({});
  const [savingPage, setSavingPage] = useState(false);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const [editorInstance, setEditorInstance] = useState<any>(null);
  const [editorMode, setEditorMode] = useState<"visual" | "raw" | "preview">(
    "visual",
  );
  const [showTopBtn, setShowTopBtn] = useState(false);
  const [isDirty, setIsDirty] = useState(false);
  const [showDangerZone, setShowDangerZone] = useState(false);

  useEffect(() => {
    const handleScroll = () => {
      if (window.scrollY > 400) {
        setShowTopBtn(true);
      } else {
        setShowTopBtn(false);
      }
    };
    window.addEventListener("scroll", handleScroll);
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  const fetchCourts = async () => {
    try {
      const res = await fetch("/api/admin/courts");
      const data = await res.json();
      if (data.courts) setCourts(data.courts);
    } catch (err) {
      console.error(err);
    } finally {
      setCourtsLoading(false);
    }
  };

  const fetchCoupons = async () => {
    try {
      const res = await fetch('/api/admin/coupons');
      if (res.status === 403) {
        setCouponsLoading(false);
        return;
      }
      const data = await res.json();
      if (data.coupons) setCoupons(data.coupons);
    } catch (err: any) {
      console.error('Failed to load coupons', err);
    } finally {
      setCouponsLoading(false);
    }
  };

  const fetchPages = async () => {
    try {
      const res = await fetch('/api/admin/pages');
      const data = await res.json();
      if (data.pages) setCustomPages(data.pages);
    } catch (err) {
      console.error('Failed to load pages', err);
    } finally {
      setPagesLoading(false);
    }
  };

  useEffect(() => {
    fetch("/api/admin/settings")
      .then((res) => res.json())
      .then((data) => {
        if (data.settings) {
          setCutoffMinutes(data.settings.cancellationCutoffMinutes);
          setMaxHoursPerDay(data.settings.maxHoursPerDay ?? 2);
          setMaxDaysInAdvance(data.settings.maxDaysInAdvance ?? 3);
          setCalendarDaysToShow(data.settings.calendarDaysToShow ?? 3);
          setCalendarSkipDays(data.settings.calendarSkipDays ?? 1);
          setPrimaryColor(data.settings.primaryColor ?? "#4f46e5");
          setSecondaryColor(data.settings.secondaryColor ?? "#10b981");
          setFontFamily(data.settings.fontFamily ?? "Inter");
          setHeroImageUrl(data.settings.heroImageUrl ?? "");
          setPromoImageUrl(data.settings.promoImageUrl ?? "");
          setPromoLinkUrl(data.settings.promoLinkUrl ?? "");
          setExternalWebsiteUrl(data.settings.externalWebsiteUrl ?? "");
          setLogoUrl(data.settings.logoUrl ?? "");
          setCourtOpenTime(data.settings.courtOpenTime ?? 6);
          setCourtCloseTime(data.settings.courtCloseTime ?? 23);
          setActiveSeason(data.settings.activeSeason ?? "2026");
          setEnableCsvImport(data.settings.enableCsvImport ?? true);
          setEnableWelcomeEmails(data.settings.enableWelcomeEmails ?? true);
          if (data.settings.enableMemberCourtBooking !== undefined) {
            setEnableMemberCourtBooking(data.settings.enableMemberCourtBooking);
          }
          if (data.settings.simpleLandingPage !== undefined) {
            setSimpleLandingPage(data.settings.simpleLandingPage);
          }
          setEnableQrCheckIn(data.settings.enableQrCheckIn ?? false);
          setRequireGpsCheckIn(data.settings.requireGpsCheckIn ?? false);
          if (data.settings.clubLatitude !== null) setClubLatitude(String(data.settings.clubLatitude));
          if (data.settings.clubLongitude !== null) setClubLongitude(String(data.settings.clubLongitude));
          if (
            data.settings.genderOptions &&
            Array.isArray(data.settings.genderOptions)
          ) {
            setGenderOptions(data.settings.genderOptions.join(", "));
          }
          if (data.isSuperAdmin !== undefined) {
            setIsSuperAdmin(data.isSuperAdmin);
          }
          if (data.settings.heroTitle) setHeroTitle(data.settings.heroTitle);
          if (data.settings.heroSubtitle) setHeroSubtitle(data.settings.heroSubtitle);
          if (data.settings.feature1Title) setFeature1Title(data.settings.feature1Title);
          if (data.settings.feature1Desc) setFeature1Desc(data.settings.feature1Desc);
          if (data.settings.feature2Title) setFeature2Title(data.settings.feature2Title);
          if (data.settings.feature2Desc) setFeature2Desc(data.settings.feature2Desc);
          if (data.settings.feature3Title) setFeature3Title(data.settings.feature3Title);
          if (data.settings.feature3Desc) setFeature3Desc(data.settings.feature3Desc);
        }
        setLoading(false);
      })
      .catch((err) => {
        console.error(err);
        setLoading(false);
      });

    fetch("/api/admin/plans")
      .then((res) => res.json())
      .then((data) => {
        if (data.plans) setPlans(data.plans);
        setPlansLoading(false);
      })
      .catch((err) => {
        console.error(err);
        setPlansLoading(false);
      });

    fetchCourts();

    fetch("/api/admin/email-templates")
      .then((res) => res.json())
      .then((data) => {
        if (data.templates) setEmailTemplates(data.templates);
      })
      .catch(console.error);

    fetch("/api/admin/booking-types")
      .then((res) => res.json())
      .then((data) => {
        if (data.bookingTypes) setBookingTypes(data.bookingTypes);
        setBookingTypesLoading(false);
      })
      .catch((err) => {
        console.error(err);
        setBookingTypesLoading(false);
      });
      
      fetchCoupons();
    fetchPages();
  }, []);

  const handleSaveNewBookingType = async () => {
    if (!newBookingType.name) return alert("Name is required");
    setSavingBookingType(true);
    try {
      const res = await fetch("/api/admin/booking-types", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(newBookingType),
      });
      if (res.ok) {
        const data = await res.json();
        setBookingTypes([...bookingTypes, data.bookingType]);
        setNewBookingType({ name: "", color: "#8b5cf6", allowMemberRegistration: false, minParticipants: "", maxParticipants: "", defaultCost: "" });
      } else {
        const data = await res.json();
        alert(`Failed to save new booking type: ${data.error}`);
      }
    } catch (err) {
      alert("Error saving booking type");
    }
    setSavingBookingType(false);
  };

  const handleStartEditBookingType = (bt: BookingType) => {
    setEditingBookingTypeId(bt.id);
    setEditBookingTypeForm({
      id: bt.id,
      name: bt.name,
      color: bt.color,
      isBuiltIn: bt.isBuiltIn,
      allowMemberRegistration: bt.allowMemberRegistration,
      minParticipants: bt.minParticipants ? bt.minParticipants.toString() : "",
      maxParticipants: bt.maxParticipants ? bt.maxParticipants.toString() : "",
      defaultCost: bt.defaultCost ? bt.defaultCost.toString() : ""
    });
  };

  const handleSaveEditBookingType = async () => {
    if (
      !editingBookingTypeId ||
      (!editBookingTypeForm.name && !editBookingTypeForm.color)
    )
      return;
    try {
      const res = await fetch(
        `/api/admin/booking-types/${editingBookingTypeId}`,
        {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(editBookingTypeForm),
        },
      );
      if (res.ok) {
        const data = await res.json();
        setBookingTypes(
          bookingTypes.map((bt) =>
            bt.id === editingBookingTypeId ? data.bookingType : bt,
          ),
        );
        setEditingBookingTypeId(null);
      } else {
        const data = await res.json();
        alert(data.error || "Failed to update booking type");
      }
    } catch (err) {
      alert("Error updating booking type");
    }
  };

  const handleDeleteBookingType = async (bt: BookingType) => {
    if (bt.isBuiltIn) return alert("Cannot delete built-in booking types.");
    if (
      !confirm(`Are you sure you want to delete the ${bt.name} booking type?`)
    )
      return;
    try {
      const res = await fetch(`/api/admin/booking-types/${bt.id}`, {
        method: "DELETE",
      });
      if (res.ok) {
        setBookingTypes(bookingTypes.filter((b) => b.id !== bt.id));
      } else {
        const data = await res.json();
        alert(data.error || "Failed to delete booking type");
      }
    } catch (err) {
      alert("Error deleting booking type");
    }
  };

  const handleSaveCoupon = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!couponFormData.code || !couponFormData.discountAmount) return alert("Code and Discount Amount are required");
    try {
      const payload = {
        id: editingCouponId,
        ...couponFormData,
        discountAmount: parseFloat(couponFormData.discountAmount),
        maxUses: couponFormData.maxUses ? parseInt(couponFormData.maxUses) : null,
      };

      const res = await fetch('/api/admin/coupons', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });
      
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to save coupon');

      setEditingCouponId(null);
      setShowAddCoupon(false);
      setCouponFormData({
        code: '',
        discountType: 'FIXED',
        discountAmount: '',
        description: '',
        maxUses: '',
        expiryDate: '',
        validForMemberships: false
      });
      await fetchCoupons();
    } catch (err: any) {
      alert(err.message);
    }
  };

  const handleEditCoupon = (c: CouponCode) => {
    setEditingCouponId(c.id);
    setShowAddCoupon(true);
    setCouponFormData({
      code: c.code,
      discountType: c.discountType,
      discountAmount: c.discountAmount.toString(),
      description: c.description || '',
      maxUses: c.maxUses ? c.maxUses.toString() : '',
      expiryDate: c.expiryDate ? new Date(c.expiryDate).toISOString().split('T')[0] : '',
      validForMemberships: c.validForMemberships
    });
  };

  const handleDeleteCoupon = async (id: string) => {
    if (!confirm('Are you sure you want to delete this coupon?')) return;
    try {
      const res = await fetch(`/api/admin/coupons?id=${id}`, { method: 'DELETE' });
      if (!res.ok) throw new Error('Failed to delete coupon');
      await fetchCoupons();
    } catch (err: any) {
      alert(err.message);
    }
  };

  const handleSavePage = async () => {
    if (!pageForm.title || !pageForm.slug) return alert('Title and Slug are required');
    setSavingPage(true);
    try {
      const method = editingPageId ? 'PUT' : 'POST';
      const url = editingPageId ? `/api/admin/pages/${editingPageId}` : '/api/admin/pages';
      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(pageForm)
      });
      const data = await res.json();
      if (res.ok) {
        setEditingPageId(null);
        setShowAddPage(false);
        setPageForm({});
        await fetchPages();
      } else {
        alert(data.error || 'Failed to save page');
      }
    } catch (err) {
      alert('Error saving page');
    }
    setSavingPage(false);
  };

  const handleStartEditPage = (page: CustomPage) => {
    setEditingPageId(page.id);
    setPageForm(page);
    setShowAddPage(true);
  };

  const handleDeletePage = async (id: string) => {
    if (!confirm('Are you sure you want to delete this page?')) return;
    try {
      const res = await fetch(`/api/admin/pages/${id}`, { method: 'DELETE' });
      if (res.ok) {
        await fetchPages();
      } else {
        alert('Failed to delete page');
      }
    } catch (err) {
      alert('Error deleting page');
    }
  };

  const handleSave = async () => {
    setSaving(true);
    setMessage("");
    try {
      const res = await fetch("/api/admin/settings", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          cancellationCutoffMinutes: cutoffMinutes,
          maxHoursPerDay: maxHoursPerDay,
          maxDaysInAdvance: maxDaysInAdvance,
          calendarDaysToShow: calendarDaysToShow,
          calendarSkipDays: calendarSkipDays,
          primaryColor: primaryColor,
          secondaryColor: secondaryColor,
          fontFamily: fontFamily,
          heroImageUrl: heroImageUrl || null,
          promoImageUrl: promoImageUrl || null,
          promoLinkUrl: promoLinkUrl || null,
          externalWebsiteUrl: isSuperAdmin ? externalWebsiteUrl : undefined,
          logoUrl: logoUrl || null,
          activeSeason,
          enableCsvImport,
          enableWelcomeEmails,
          enableMemberCourtBooking,
          simpleLandingPage,
          enableQrCheckIn,
          requireGpsCheckIn,
          clubLatitude: clubLatitude ? parseFloat(clubLatitude) : null,
          clubLongitude: clubLongitude ? parseFloat(clubLongitude) : null,
          courtOpenTime,
          courtCloseTime,
          genderOptions: genderOptions
            .split(",")
            .map((s) => s.trim())
            .filter(Boolean),
          heroTitle,
          heroSubtitle,
          feature1Title,
          feature1Desc,
          feature2Title,
          feature2Desc,
          feature3Title,
          feature3Desc,
        }),
      });
      if (res.ok) {
        setMessage("Settings saved successfully!");
        setIsDirty(false);
      } else {
        setMessage("Failed to save settings.");
      }
    } catch (err) {
      setMessage("An error occurred while saving.");
    }
    setSaving(false);
    setTimeout(() => setMessage(""), 3000);
  };

  const handleSaveNewPlan = async () => {
    if (!newPlan.name || newPlan.cost < 0)
      return alert("Name and a valid cost are required");
    setSavingPlan(true);
    try {
      const res = await fetch("/api/admin/plans", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(newPlan),
      });
      if (res.ok) {
        const data = await res.json();
        setPlans([...plans, data.plan]);
        setNewPlan({ name: "", description: "", cost: 0 });
      } else {
        alert("Failed to save new plan. Name must be unique.");
      }
    } catch (err) {
      alert("Error saving plan");
    }
    setSavingPlan(false);
  };

  const handleStartEditPlan = (plan: MembershipPlan) => {
    setEditingPlanId(plan.id);
    setEditPlanForm(plan);
  };

  const handleSaveEditPlan = async () => {
    if (!editingPlanId || !editPlanForm.name) return;
    try {
      const res = await fetch(`/api/admin/plans/${editingPlanId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(editPlanForm),
      });
      if (res.ok) {
        const data = await res.json();
        setPlans(plans.map((p) => (p.id === editingPlanId ? data.plan : p)));
        setEditingPlanId(null);
      } else {
        alert("Failed to update plan");
      }
    } catch (err) {
      alert("Error updating plan");
    }
  };

  const handleToggleArchivePlan = async (plan: MembershipPlan) => {
    if (
      !confirm(
        `Are you sure you want to ${plan.isArchived ? "unarchive" : "archive"} the ${plan.name} plan?`,
      )
    )
      return;
    try {
      const res = await fetch(`/api/admin/plans/${plan.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ isArchived: !plan.isArchived }),
      });
      if (res.ok) {
        const data = await res.json();
        setPlans(plans.map((p) => (p.id === plan.id ? data.plan : p)));
      } else {
        alert("Failed to archive/unarchive plan");
      }
    } catch (err) {
      alert("Error updating plan");
    }
  };

  const handleSaveNewCourt = async () => {
    if (!newCourt.name) return alert("Name is required");
    try {
      const res = await fetch("/api/admin/courts", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: newCourt.name,
          openTime: newCourt.openTime ? parseInt(newCourt.openTime) : null,
          closeTime: newCourt.closeTime ? parseInt(newCourt.closeTime) : null,
        }),
      });
      if (res.ok) {
        const data = await res.json();
        setCourts([...courts, data.court]);
        setNewCourt({ name: "", openTime: "", closeTime: "" });
      } else {
        const data = await res.json();
        alert(`Failed to save new court: ${data.error}`);
      }
    } catch (err) {
      alert("Error saving court");
    }
  };

  const handleStartEditCourt = (court: Court) => {
    setEditingCourtId(court.id);
    setEditCourtForm({
      ...court,
      openTime: court.openTime ?? undefined,
      closeTime: court.closeTime ?? undefined,
    });
  };

  const handleSaveEditCourt = async () => {
    if (!editingCourtId || !editCourtForm.name) return;
    try {
      const res = await fetch(`/api/admin/courts/${editingCourtId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: editCourtForm.name,
          openTime: editCourtForm.openTime
            ? Number(editCourtForm.openTime)
            : null,
          closeTime: editCourtForm.closeTime
            ? Number(editCourtForm.closeTime)
            : null,
        }),
      });
      if (res.ok) {
        const data = await res.json();
        setCourts(
          courts.map((c) => (c.id === editingCourtId ? data.court : c)),
        );
        setEditingCourtId(null);
      } else {
        alert("Failed to update court");
      }
    } catch (err) {
      alert("Error updating court");
    }
  };

  const handleDeleteCourt = async (court: Court) => {
    if (
      !confirm(
        `Are you sure you want to delete ${court.name}? This cannot be undone.`,
      )
    )
      return;
    try {
      const res = await fetch(`/api/admin/courts/${court.id}`, {
        method: "DELETE",
      });
      if (res.ok) {
        setCourts(courts.filter((c) => c.id !== court.id));
      } else {
        const data = await res.json();
        alert(data.error || "Failed to delete court");
      }
    } catch (err) {
      alert("Error deleting court");
    }
  };

  const handleTemplateSelect = (id: string) => {
    setSelectedTemplateId(id);
    const existing = emailTemplates.find((t) => t.id === id);
    if (existing) {
      setEditTemplateForm(existing);
    } else {
      const fallback = DEFAULT_TEMPLATES[id] || { subject: "", htmlBody: "" };
      setEditTemplateForm(fallback);
    }
  };

  const handleResetTemplate = async () => {
    if (!selectedTemplateId) return;
    if (
      !window.confirm(
        "Are you sure you want to reset this template to the system default? This will erase your customizations.",
      )
    )
      return;

    setSavingTemplate(true);
    try {
      const res = await fetch(
        `/api/admin/email-templates?id=${selectedTemplateId}`,
        {
          method: "DELETE",
        },
      );
      if (res.ok) {
        alert("Template reset to default successfully!");
        setEmailTemplates((prev) =>
          prev.filter((t) => t.id !== selectedTemplateId),
        );
        const fallback = DEFAULT_TEMPLATES[selectedTemplateId] || {
          subject: "",
          htmlBody: "",
        };
        setEditTemplateForm(fallback);
      } else {
        const data = await res.json();
        alert(data.error || "Failed to reset template");
      }
    } catch (err) {
      alert("Error resetting template");
    }
    setWiping(false);
  };

  const handleWipeSystem = async () => {
    if (
      !confirm(
        "WARNING: This will permanently delete ALL users, memberships, member court bookings, and event registrations from the database. Only the Super Admin account, settings, coupons, club events, and non-member bookings will remain. This action CANNOT be undone.\n\nAre you absolutely sure you want to proceed?",
      )
    )
      return;
    
    // Double confirmation for extreme safety
    const confirmWord = window.prompt("Type 'WIPE' to confirm deleting all database records:");
    if (confirmWord !== "WIPE") {
      alert("System wipe cancelled.");
      return;
    }

    setWipingSystem(true);
    try {
      const res = await fetch("/api/admin/system-wipe", {
        method: "POST",
      });
      if (res.ok) {
        alert("System successfully wiped. Logging out...");
        window.location.href = "/login"; // Force them to login again
      } else {
        const data = await res.json();
        alert(`Failed to wipe system: ${data.error}`);
      }
    } catch (err) {
      alert("Error wiping system");
    }
    setWipingSystem(false);
  };

  const handleSaveTemplate = async () => {
    if (
      !selectedTemplateId ||
      !editTemplateForm.subject ||
      !editTemplateForm.htmlBody
    )
      return alert("Subject and HTML Body are required");
    setSavingTemplate(true);
    try {
      const res = await fetch("/api/admin/email-templates", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          id: selectedTemplateId,
          subject: editTemplateForm.subject,
          htmlBody: editTemplateForm.htmlBody,
        }),
      });
      if (res.ok) {
        const data = await res.json();
        setEmailTemplates((prev) => {
          const exists = prev.find((t) => t.id === selectedTemplateId);
          if (exists)
            return prev.map((t) =>
              t.id === selectedTemplateId ? data.template : t,
            );
          return [...prev, data.template];
        });
        alert("Template saved successfully!");
      } else {
        alert("Failed to save template");
      }
    } catch (err) {
      alert("Error saving template");
    }
    setSavingTemplate(false);
  };

  const insertVariable = (variable: string) => {
    if (!variable) return;

    if (editorMode === "visual" && editorInstance) {
      editorInstance.commands.insertContent(variable);
      setEditTemplateForm((prev) => ({
        ...prev,
        htmlBody: editorInstance.getHTML(),
      }));
      return;
    }

    const textarea = textareaRef.current;
    if (!textarea) return;

    const startPos = textarea.selectionStart;
    const endPos = textarea.selectionEnd;
    const currentBody = editTemplateForm.htmlBody || "";

    const newBody =
      currentBody.substring(0, startPos) +
      variable +
      currentBody.substring(endPos);
    setEditTemplateForm({ ...editTemplateForm, htmlBody: newBody });

    // Move cursor after the inserted variable
    setTimeout(() => {
      textarea.focus();
      textarea.setSelectionRange(
        startPos + variable.length,
        startPos + variable.length,
      );
    }, 0);
  };

  const handleWipeBookings = async () => {
    const confirm1 = confirm(
      "DANGER: This will permanently delete ALL court bookings from the database. This action CANNOT BE UNDONE. Are you absolutely sure?",
    );
    if (!confirm1) return;

    const confirm2 = confirm(
      "Please confirm one more time: Do you really want to WIPE ALL BOOKINGS?",
    );
    if (!confirm2) return;

    setWiping(true);
    try {
      const res = await fetch("/api/admin/bookings/wipe", { method: "DELETE" });
      if (res.ok) {
        const data = await res.json();
        alert(`Successfully deleted ${data.count} bookings.`);
      } else {
        alert("Failed to wipe bookings.");
      }
    } catch (err) {
      alert("Error wiping bookings.");
    }
    setWiping(false);
  };

  if (loading || plansLoading || courtsLoading || couponsLoading)
    return <div className="p-8">Loading settings...</div>;

  return (
    <div className="bg-white rounded-lg shadow-sm border p-6 max-w-2xl mx-auto mt-8">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between mb-6 gap-4">
        <h2 className="text-2xl font-bold text-gray-800">System Settings</h2>
        <div className="flex flex-wrap items-center gap-3">
          <ReleaseNotesWidget />
          <button
            onClick={handleSave}
            disabled={!isDirty || saving}
            className="px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-primary-600 hover:bg-primary-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500 disabled:opacity-50 whitespace-nowrap"
          >
            {saving ? "Saving..." : "Save Settings"}
          </button>
          <Link
            href="/admin"
            onClick={(e) => {
              if (isDirty && !window.confirm("You have unsaved changes. Are you sure you want to leave?")) {
                e.preventDefault();
              }
            }}
            className="inline-flex items-center px-4 py-2 border border-gray-300 shadow-sm text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500 transition-colors whitespace-nowrap"
          >
            <svg
              className="-ml-1 mr-2 h-5 w-5 text-gray-500"
              xmlns="http://www.w3.org/2000/svg"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M10 19l-7-7m0 0l7-7m-7 7h18"
              />
            </svg>
            Back to Dashboard
          </Link>
        </div>
      </div>

      <div className="space-y-6" onChange={() => setIsDirty(true)}>

        <div className="border-b pb-6">
          <h3 className="text-lg font-medium text-gray-900 mb-4">
            Court Settings
          </h3>

          <div className="flex flex-col space-y-4">
            <div className="flex flex-col space-y-2">
              <label className="text-sm font-medium text-gray-700">
                Allow Member Registration & Booking
              </label>
              <div className="flex items-center mt-2">
                <button
                  type="button"
                  onClick={() => setEnableMemberCourtBooking(!enableMemberCourtBooking)}
                  className={`${
                    enableMemberCourtBooking ? "bg-primary-600" : "bg-gray-200"
                  } relative inline-flex h-6 w-11 flex-shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none focus:ring-2 focus:ring-primary-600 focus:ring-offset-2`}
                >
                  <span
                    aria-hidden="true"
                    className={`${
                      enableMemberCourtBooking ? "translate-x-5" : "translate-x-0"
                    } pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out`}
                  />
                </button>
                <span className="ml-3 text-sm text-gray-500">
                  {enableMemberCourtBooking
                    ? "Members can book courts."
                    : "Booking is disabled."}
                </span>
              </div>
            </div>

            <div className="flex flex-col space-y-2">
              <label className="text-sm font-medium text-gray-700">
                Use Simple Landing Page
              </label>
              <div className="flex items-center mt-2">
                <button
                  type="button"
                  onClick={() => setSimpleLandingPage(!simpleLandingPage)}
                  className={`${
                    simpleLandingPage ? "bg-primary-600" : "bg-gray-200"
                  } relative inline-flex h-6 w-11 flex-shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none focus:ring-2 focus:ring-primary-600 focus:ring-offset-2`}
                >
                  <span
                    aria-hidden="true"
                    className={`${
                      simpleLandingPage ? "translate-x-5" : "translate-x-0"
                    } pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out`}
                  />
                </button>
                <span className="ml-3 text-sm text-gray-500">
                  {simpleLandingPage
                    ? "Hides extra marketing sections. Shows only the hero image and buttons."
                    : "Shows the full marketing webpage with features and promos."}
                </span>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mt-6">
            <div className="flex flex-col space-y-2">
              <label className="text-sm font-medium text-gray-700">
                Cancellation Cutoff (Minutes)
              </label>
              <p className="text-sm text-gray-500 mb-2">
                Members cannot cancel a booking if the start time is less than
                this many minutes away.
              </p>
              <div className="flex items-center space-x-3">
                <input
                  type="number"
                  min="0"
                  value={cutoffMinutes}
                  onChange={(e) =>
                    setCutoffMinutes(parseInt(e.target.value) || 0)
                  }
                  className="block w-24 rounded-md border-gray-300 shadow-sm focus:border-primary-500 focus:ring-primary-500 p-2 border"
                />
                <span className="text-gray-600">minutes</span>
              </div>
            </div>

            <div className="flex flex-col space-y-2">
              <label className="text-sm font-medium text-gray-700">
                Max Hours Per Day
              </label>
              <p className="text-sm text-gray-500 mb-2">
                The maximum number of hours a member can book courts per day.
              </p>
              <div className="flex items-center space-x-3">
                <input
                  type="number"
                  min="1"
                  max="24"
                  value={maxHoursPerDay}
                  onChange={(e) =>
                    setMaxHoursPerDay(parseInt(e.target.value) || 1)
                  }
                  className="block w-24 rounded-md border-gray-300 shadow-sm focus:border-primary-500 focus:ring-primary-500 p-2 border"
                />
                <span className="text-gray-600">hours</span>
              </div>
            </div>

            <div className="flex flex-col space-y-2">
              <label className="text-sm font-medium text-gray-700">
                Max Days in Advance
              </label>
              <p className="text-sm text-gray-500 mb-2">
                How many days into the future a member is allowed to book a
                court.
              </p>
              <div className="flex items-center space-x-3">
                <input
                  type="number"
                  min="1"
                  max="365"
                  value={maxDaysInAdvance}
                  onChange={(e) =>
                    setMaxDaysInAdvance(parseInt(e.target.value) || 1)
                  }
                  className="block w-24 rounded-md border-gray-300 shadow-sm focus:border-primary-500 focus:ring-primary-500 p-2 border"
                />
                <span className="text-gray-600">days</span>
              </div>
            </div>

            <div className="flex flex-col space-y-2">
              <label className="text-sm font-medium text-gray-700">
                Calendar View Span
              </label>
              <p className="text-sm text-gray-500 mb-2">
                How many days to show side-by-side on the booking calendar.
              </p>
              <div className="flex items-center space-x-3">
                <input
                  type="number"
                  min="1"
                  max="7"
                  value={calendarDaysToShow}
                  onChange={(e) =>
                    setCalendarDaysToShow(parseInt(e.target.value) || 3)
                  }
                  className="block w-24 rounded-md border-gray-300 shadow-sm focus:border-primary-500 focus:ring-primary-500 p-2 border"
                />
                <span className="text-gray-600">days</span>
              </div>
            </div>

            <div className="flex flex-col space-y-2">
              <label className="text-sm font-medium text-gray-700">
                Calendar Skip Amount
              </label>
              <p className="text-sm text-gray-500 mb-2">
                How many days the calendar jumps forward/backward when clicking
                Prev/Next.
              </p>
              <div className="flex items-center space-x-3">
                <input
                  type="number"
                  min="1"
                  max="30"
                  value={calendarSkipDays}
                  onChange={(e) =>
                    setCalendarSkipDays(parseInt(e.target.value) || 1)
                  }
                  className="block w-24 rounded-md border-gray-300 shadow-sm focus:border-primary-500 focus:ring-primary-500 p-2 border"
                />
                <span className="text-gray-600">days</span>
              </div>
            </div>
          </div>
        </div>

        <div className="border-b pb-6">
          <h3 className="text-lg font-medium text-gray-900 mb-4">
            Court Operating Hours
          </h3>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="flex flex-col space-y-2">
              <label className="text-sm font-medium text-gray-700">
                Open Time (0-23)
              </label>
              <p className="text-sm text-gray-500 mb-2">
                The hour (in 24h format) when the courts open.
              </p>
              <div className="flex items-center space-x-3">
                <input
                  type="number"
                  min="0"
                  max="23"
                  value={courtOpenTime}
                  onChange={(e) =>
                    setCourtOpenTime(parseInt(e.target.value) || 0)
                  }
                  className="block w-24 rounded-md border-gray-300 shadow-sm focus:border-primary-500 focus:ring-primary-500 p-2 border"
                />
                <span className="text-gray-600">:00</span>
              </div>
            </div>

            <div className="flex flex-col space-y-2">
              <label className="text-sm font-medium text-gray-700">
                Close Time (0-24)
              </label>
              <p className="text-sm text-gray-500 mb-2">
                The hour (in 24h format) when the courts close.
              </p>
              <div className="flex items-center space-x-3">
                <input
                  type="number"
                  min="1"
                  max="24"
                  value={courtCloseTime}
                  onChange={(e) =>
                    setCourtCloseTime(parseInt(e.target.value) || 24)
                  }
                  className="block w-24 rounded-md border-gray-300 shadow-sm focus:border-primary-500 focus:ring-primary-500 p-2 border"
                />
                <span className="text-gray-600">:00</span>
              </div>
            </div>
          </div>
        </div>

        <div className="border-b pb-6">
          <h3 className="text-lg font-medium text-gray-900 mb-4">
            Courts Management
          </h3>
          <div className="space-y-4 mb-6">
            {courts.map((court) => (
              <div
                key={court.id}
                className="border border-gray-400 rounded-md p-4 flex justify-between items-start bg-gray-50"
              >
                {editingCourtId === court.id ? (
                  <div className="w-full flex flex-col space-y-3">
                    <input
                      className="border border-gray-300 rounded-md px-2 py-1 text-sm font-medium text-gray-900 w-full"
                      value={editCourtForm.name}
                      onChange={(e) =>
                        setEditCourtForm({
                          ...editCourtForm,
                          name: e.target.value,
                        })
                      }
                      placeholder="Court Name"
                    />
                    <div className="flex items-center space-x-3 text-sm text-gray-600">
                      <span>Open Time:</span>
                      <input
                        type="number"
                        min="0"
                        max="23"
                        className="border border-gray-300 rounded-md px-2 py-1 text-sm w-20"
                        value={editCourtForm.openTime ?? ""}
                        onChange={(e) =>
                          setEditCourtForm({
                            ...editCourtForm,
                            openTime: parseInt(e.target.value),
                          })
                        }
                        placeholder="Global"
                      />
                      <span>Close Time:</span>
                      <input
                        type="number"
                        min="0"
                        max="23"
                        className="border border-gray-300 rounded-md px-2 py-1 text-sm w-20"
                        value={editCourtForm.closeTime ?? ""}
                        onChange={(e) =>
                          setEditCourtForm({
                            ...editCourtForm,
                            closeTime: parseInt(e.target.value),
                          })
                        }
                        placeholder="Global"
                      />
                    </div>
                    <div className="flex space-x-2 pt-2">
                      <button
                        onClick={handleSaveEditCourt}
                        className="text-primary-600 hover:text-primary-900 text-sm font-medium"
                      >
                        Save
                      </button>
                      <button
                        onClick={() => setEditingCourtId(null)}
                        className="text-gray-500 hover:text-gray-700 text-sm font-medium"
                      >
                        Cancel
                      </button>
                    </div>
                  </div>
                ) : (
                  <>
                    <div>
                      <h4 className="text-base font-medium text-gray-900">
                        {court.name}
                      </h4>
                      <div className="text-sm text-gray-500 mt-1">
                        Hours: {court.openTime ?? "Global"} to{" "}
                        {court.closeTime ?? "Global"}
                      </div>
                    </div>
                    <div className="flex space-x-3">
                      <button
                        onClick={() => handleStartEditCourt(court)}
                        className="text-primary-600 hover:text-primary-900 text-sm font-medium"
                      >
                        Edit
                      </button>
                      <button
                        onClick={() => handleDeleteCourt(court)}
                        className="text-red-600 hover:text-red-900 text-sm font-medium"
                      >
                        Delete
                      </button>
                    </div>
                  </>
                )}
              </div>
            ))}
            {courts.length === 0 && (
              <p className="text-sm text-gray-500 italic">No courts found.</p>
            )}
          </div>

          <div className="bg-gray-50 p-4 border border-gray-400 rounded-md shadow-sm">
            <div className="flex justify-between items-center mb-3">
              <h4 className="text-sm font-medium text-gray-900">
                Add New Court
              </h4>
              <button
                onClick={() => setShowAddCourt(!showAddCourt)}
                className="text-primary-600 text-sm font-medium hover:text-primary-800"
              >
                {showAddCourt ? "Cancel" : "+ Add Court"}
              </button>
            </div>
            {showAddCourt && (
              <div className="flex flex-col space-y-3">
                <input
                  className="border border-gray-300 rounded-md px-3 py-1.5 text-sm w-full"
                  value={newCourt.name}
                  onChange={(e) =>
                    setNewCourt({ ...newCourt, name: e.target.value })
                  }
                  placeholder="Court Name (e.g. Court 1)"
                />
                <div className="flex items-center space-x-4 text-sm text-gray-600">
                  <div className="flex items-center space-x-2">
                    <span>Open Time:</span>
                    <input
                      type="number"
                      min="0"
                      max="23"
                      className="border border-gray-300 rounded-md px-2 py-1.5 text-sm w-20"
                      value={newCourt.openTime}
                      onChange={(e) =>
                        setNewCourt({ ...newCourt, openTime: e.target.value })
                      }
                      placeholder="Global"
                    />
                  </div>
                  <div className="flex items-center space-x-2">
                    <span>Close Time:</span>
                    <input
                      type="number"
                      min="0"
                      max="23"
                      className="border border-gray-300 rounded-md px-2 py-1.5 text-sm w-20"
                      value={newCourt.closeTime}
                      onChange={(e) =>
                        setNewCourt({ ...newCourt, closeTime: e.target.value })
                      }
                      placeholder="Global"
                    />
                  </div>
                </div>
                <div className="flex justify-end pt-1">
                  <button
                    onClick={() => {
                      handleSaveNewCourt();
                      setShowAddCourt(false);
                    }}
                    disabled={!newCourt.name}
                    className="px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-primary-600 hover:bg-primary-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    Add Court
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>

        <div className="border-b pb-6">
          <h3 className="text-lg font-medium text-gray-900 mb-4">
            Check-In Settings
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="flex flex-col space-y-2">
              <label className="text-sm font-medium text-gray-700">
                Enable QR Code Check-In
              </label>
              <p className="text-sm text-gray-500 mb-2">
                Allow members to check-in to their bookings by scanning a QR code at the club.
              </p>
              <div className="flex items-center space-x-3">
                <button
                  type="button"
                  onClick={() => setEnableQrCheckIn(!enableQrCheckIn)}
                  className={`${
                    enableQrCheckIn ? "bg-primary-600" : "bg-gray-200"
                  } relative inline-flex flex-shrink-0 h-6 w-11 border-2 border-transparent rounded-full cursor-pointer transition-colors ease-in-out duration-200 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500`}
                  role="switch"
                  aria-checked={enableQrCheckIn}
                >
                  <span className="sr-only">Enable QR Check-In</span>
                  <span
                    aria-hidden="true"
                    className={`${
                      enableQrCheckIn ? "translate-x-5" : "translate-x-0"
                    } pointer-events-none inline-block h-5 w-5 rounded-full bg-white shadow transform ring-0 transition ease-in-out duration-200`}
                  />
                </button>
                <span className="text-sm text-gray-700">
                  {enableQrCheckIn ? "Enabled" : "Disabled"}
                </span>
              </div>
              
              {enableQrCheckIn && (
                <div className="mt-4">
                  <a
                    href="/check-in?print=true"
                    target="_blank"
                    className="inline-flex items-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none"
                  >
                    <svg className="mr-2 h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 17h2a2 2 0 002-2v-4a2 2 0 00-2-2H5a2 2 0 00-2 2v4a2 2 0 002 2h2m2 4h6a2 2 0 002-2v-4a2 2 0 00-2-2H9a2 2 0 00-2 2v4a2 2 0 002 2zm8-12V5a2 2 0 00-2-2H9a2 2 0 00-2 2v4h10z" />
                    </svg>
                    Print Check-In QR Code
                  </a>
                </div>
              )}
            </div>
            
            {enableQrCheckIn && (
              <div className="flex flex-col space-y-4">
                <div className="flex flex-col space-y-2">
                  <label className="text-sm font-medium text-gray-700">
                    Require GPS Location for Check-In
                  </label>
                  <p className="text-sm text-gray-500 mb-2">
                    If enabled, members must be physically near the club to check in. (Requires HTTPS)
                  </p>
                  <div className="flex items-center space-x-3">
                    <button
                      type="button"
                      onClick={() => setRequireGpsCheckIn(!requireGpsCheckIn)}
                      className={`${
                        requireGpsCheckIn ? "bg-primary-600" : "bg-gray-200"
                      } relative inline-flex flex-shrink-0 h-6 w-11 border-2 border-transparent rounded-full cursor-pointer transition-colors ease-in-out duration-200 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500`}
                      role="switch"
                    >
                      <span className="sr-only">Require GPS Check-In</span>
                      <span
                        aria-hidden="true"
                        className={`${
                          requireGpsCheckIn ? "translate-x-5" : "translate-x-0"
                        } pointer-events-none inline-block h-5 w-5 rounded-full bg-white shadow transform ring-0 transition ease-in-out duration-200`}
                      />
                    </button>
                    <span className="text-sm text-gray-700">
                      {requireGpsCheckIn ? "Required" : "Optional"}
                    </span>
                  </div>
                </div>

                {requireGpsCheckIn && (
                  <div className="grid grid-cols-2 gap-4 mt-2">
                    <div>
                      <label className="block text-xs font-semibold text-gray-700 mb-1">Club Latitude</label>
                      <input
                        type="text"
                        value={clubLatitude}
                        onChange={(e) => setClubLatitude(e.target.value)}
                        placeholder="e.g. 43.6532"
                        className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:ring-primary-500 focus:border-primary-500"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-semibold text-gray-700 mb-1">Club Longitude</label>
                      <input
                        type="text"
                        value={clubLongitude}
                        onChange={(e) => setClubLongitude(e.target.value)}
                        placeholder="e.g. -79.3832"
                        className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:ring-primary-500 focus:border-primary-500"
                      />
                    </div>
                    <div className="col-span-2 text-xs text-gray-500">
                      To find coordinates, right-click your club on Google Maps and click the lat/long numbers at the top.
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>

        <div className="border-b pb-6">
          <h3 className="text-lg font-medium text-gray-900 mb-4">
            Registration Options
          </h3>

          <div className="flex flex-col space-y-2 max-w-lg">
            <label className="text-sm font-medium text-gray-700">
              Gender Options
            </label>
            <p className="text-sm text-gray-500 mb-2">
              Comma-separated list of gender options available during
              registration.
            </p>
            <input
              type="text"
              value={genderOptions}
              onChange={(e) => setGenderOptions(e.target.value)}
              className="block w-full rounded-md border-gray-300 shadow-sm focus:border-primary-500 focus:ring-primary-500 p-2 border"
              placeholder="e.g. Male, Female, Non-Binary"
            />
          </div>
        </div>

        <div className="border-b pb-6">
          <h3 className="text-lg font-medium text-gray-900 mb-4">
            Member Data Settings
          </h3>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="flex flex-col space-y-2">
              <label className="text-sm font-medium text-gray-700">
                Enable CSV Import
              </label>
              <p className="text-sm text-gray-500 mb-2">
                Show the "Import CSV" button on the Admin Dashboard. Typically
                only needed during initial setup.
              </p>
              <div className="flex items-center space-x-3">
                <button
                  type="button"
                  onClick={() => setEnableCsvImport(!enableCsvImport)}
                  className={`${
                    enableCsvImport ? "bg-primary-600" : "bg-gray-200"
                  } relative inline-flex flex-shrink-0 h-6 w-11 border-2 border-transparent rounded-full cursor-pointer transition-colors ease-in-out duration-200 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500`}
                  role="switch"
                  aria-checked={enableCsvImport}
                >
                  <span className="sr-only">Enable CSV Import</span>
                  <span
                    aria-hidden="true"
                    className={`${
                      enableCsvImport ? "translate-x-5" : "translate-x-0"
                    } pointer-events-none inline-block h-5 w-5 rounded-full bg-white shadow transform ring-0 transition ease-in-out duration-200`}
                  />
                </button>
                <span className="text-sm text-gray-700">
                  {enableCsvImport ? "Enabled" : "Disabled"}
                </span>
              </div>
            </div>

            <div className="flex flex-col space-y-2">
              <label className="text-sm font-medium text-gray-700">
                Enable Welcome Emails
              </label>
              <p className="text-sm text-gray-500 mb-2">
                Show the "Send Welcome Emails" button on the Admin Dashboard to
                manually trigger welcome emails for pending members.
              </p>
              <div className="flex items-center space-x-3">
                <button
                  type="button"
                  onClick={() => setEnableWelcomeEmails(!enableWelcomeEmails)}
                  className={`${
                    enableWelcomeEmails ? "bg-primary-600" : "bg-gray-200"
                  } relative inline-flex flex-shrink-0 h-6 w-11 border-2 border-transparent rounded-full cursor-pointer transition-colors ease-in-out duration-200 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500`}
                  role="switch"
                  aria-checked={enableWelcomeEmails}
                >
                  <span className="sr-only">Enable Welcome Emails</span>
                  <span
                    aria-hidden="true"
                    className={`${
                      enableWelcomeEmails ? "translate-x-5" : "translate-x-0"
                    } pointer-events-none inline-block h-5 w-5 rounded-full bg-white shadow transform ring-0 transition ease-in-out duration-200`}
                  />
                </button>
                <span className="text-sm text-gray-700">
                  {enableWelcomeEmails ? "Enabled" : "Disabled"}
                </span>
              </div>
            </div>

            <div className="flex flex-col space-y-2">
              <label className="text-sm font-medium text-gray-700">
                Club Logo URL
              </label>
              <p className="text-sm text-gray-500 mb-2">
                Provide a URL to an image to replace the default logo. We recommend a transparent PNG with a max height of 40px.
              </p>
              <div className="flex items-center space-x-3">
                <input
                  type="text"
                  value={logoUrl}
                  onChange={(e) => setLogoUrl(e.target.value)}
                  className="block w-full max-w-lg rounded-md border-gray-300 shadow-sm focus:border-primary-500 focus:ring-primary-500 p-2 border"
                  placeholder="https://example.com/logo.png"
                />
              </div>
            </div>

            <div className="flex flex-col space-y-2">
              <label className="text-sm font-medium text-gray-700">
                External Website URL
              </label>
              <p className="text-sm text-gray-500 mb-2">
                If your club has its own website (e.g. www.myclub.com), enter it here. Visitors to the root of this app will automatically be redirected there instead of seeing our built-in landing page. <strong>Requires Super Admin privileges.</strong>
              </p>
              <div className="flex items-center space-x-3">
                <input
                  type="text"
                  value={externalWebsiteUrl}
                  onChange={(e) => setExternalWebsiteUrl(e.target.value)}
                  disabled={!isSuperAdmin}
                  className="block w-full max-w-lg rounded-md border-gray-300 shadow-sm focus:border-primary-500 focus:ring-primary-500 p-2 border disabled:opacity-50 disabled:bg-gray-100"
                  placeholder="https://www.myclub.com"
                />
              </div>
            </div>

            <div className="flex flex-col space-y-2">
              <label className="text-sm font-medium text-gray-700">
                Active Season
              </label>
              <p className="text-sm text-gray-500 mb-2">
                The current active membership year. Change this to rollover to
                the next year.
              </p>
              <div className="flex items-center space-x-3">
                <input
                  type="text"
                  value={activeSeason}
                  onChange={(e) => setActiveSeason(e.target.value)}
                  className="block w-24 rounded-md border-gray-300 shadow-sm focus:border-primary-500 focus:ring-primary-500 p-2 border"
                  placeholder="e.g. 2026"
                />
              </div>
            </div>
          </div>
        </div>

        <div className="border-b pb-6">
          <div className="flex justify-between items-center mb-4">
            <h3 className="text-lg font-medium text-gray-900">Coupon Codes</h3>
            {!showAddCoupon && (
              <button
                onClick={() => {
                  setEditingCouponId(null);
                  setCouponFormData({
                    code: '',
                    discountType: 'FIXED',
                    discountAmount: '',
                    description: '',
                    maxUses: '',
                    expiryDate: '',
                    validForMemberships: false
                  });
                  setShowAddCoupon(true);
                }}
                className="bg-indigo-50 text-indigo-700 px-3 py-1 text-sm font-medium rounded-md hover:bg-indigo-100 transition-colors"
              >
                + Add Coupon
              </button>
            )}
          </div>
          
          {showAddCoupon && (
            <div className="bg-gray-50 p-4 rounded-md mb-4 border border-gray-200">
              <h4 className="text-md font-medium text-gray-900 mb-3">{editingCouponId ? 'Edit Coupon' : 'New Coupon'}</h4>
              <form onSubmit={handleSaveCoupon} className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Code</label>
                    <input 
                      required
                      type="text" 
                      value={couponFormData.code}
                      onChange={(e) => setCouponFormData({...couponFormData, code: e.target.value})}
                      className="w-full border-gray-300 rounded-md shadow-sm focus:border-primary-500 focus:ring-primary-500 text-sm"
                      placeholder="e.g. SUMMER26"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Description / Notes</label>
                    <input 
                      type="text" 
                      value={couponFormData.description}
                      onChange={(e) => setCouponFormData({...couponFormData, description: e.target.value})}
                      className="w-full border-gray-300 rounded-md shadow-sm focus:border-primary-500 focus:ring-primary-500 text-sm"
                      placeholder="e.g. Raffle winner discount"
                    />
                  </div>
                  <div className="flex gap-4">
                    <div className="w-1/3">
                      <label className="block text-sm font-medium text-gray-700 mb-1">Type</label>
                      <select 
                        value={couponFormData.discountType}
                        onChange={(e) => setCouponFormData({...couponFormData, discountType: e.target.value as any})}
                        className="w-full border-gray-300 rounded-md shadow-sm focus:border-primary-500 focus:ring-primary-500 text-sm"
                      >
                        <option value="FIXED">Fixed ($)</option>
                        <option value="PERCENT">Percent (%)</option>
                      </select>
                    </div>
                    <div className="w-2/3">
                      <label className="block text-sm font-medium text-gray-700 mb-1">Discount Amount</label>
                      <input 
                        required
                        type="number" 
                        step="0.01"
                        min="0.01"
                        value={couponFormData.discountAmount}
                        onChange={(e) => setCouponFormData({...couponFormData, discountAmount: e.target.value})}
                        className="w-full border-gray-300 rounded-md shadow-sm focus:border-primary-500 focus:ring-primary-500 text-sm"
                        placeholder={couponFormData.discountType === 'FIXED' ? "20.00" : "15"}
                      />
                    </div>
                  </div>
                  <div className="flex gap-4">
                    <div className="w-1/2">
                      <label className="block text-sm font-medium text-gray-700 mb-1">Expiry Date (Optional)</label>
                      <input 
                        type="date" 
                        value={couponFormData.expiryDate}
                        onChange={(e) => setCouponFormData({...couponFormData, expiryDate: e.target.value})}
                        className="w-full border-gray-300 rounded-md shadow-sm focus:border-primary-500 focus:ring-primary-500 text-sm"
                      />
                    </div>
                    <div className="w-1/2">
                      <label className="block text-sm font-medium text-gray-700 mb-1">Max Uses (Optional)</label>
                      <input 
                        type="number" 
                        min="1"
                        value={couponFormData.maxUses}
                        onChange={(e) => setCouponFormData({...couponFormData, maxUses: e.target.value})}
                        className="w-full border-gray-300 rounded-md shadow-sm focus:border-primary-500 focus:ring-primary-500 text-sm"
                        placeholder="Unlimited"
                      />
                    </div>
                  </div>
                  <div className="md:col-span-2 pt-2">
                    <label className="flex items-center space-x-3 cursor-pointer">
                      <input 
                        type="checkbox" 
                        checked={couponFormData.validForMemberships}
                        onChange={(e) => setCouponFormData({...couponFormData, validForMemberships: e.target.checked})}
                        className="rounded border-gray-300 text-primary-600 focus:ring-primary-500 h-4 w-4"
                      />
                      <span className="text-sm font-medium text-gray-900">Valid for Membership Renewals & Registrations</span>
                    </label>
                  </div>
                </div>
                <div className="flex justify-end gap-2 mt-4 pt-4 border-t border-gray-200">
                  <button
                    type="button"
                    onClick={() => setShowAddCoupon(false)}
                    className="px-3 py-1.5 border border-gray-300 rounded-md text-sm font-medium text-gray-700 hover:bg-gray-50"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="px-3 py-1.5 bg-primary-600 text-white rounded-md text-sm font-medium hover:bg-primary-700"
                  >
                    Save Coupon
                  </button>
                </div>
              </form>
            </div>
          )}

          <div className="mt-4">
            {coupons.length === 0 ? (
              <p className="text-sm text-gray-500 italic">No coupons defined yet.</p>
            ) : (
              <div className="border border-gray-200 rounded-md overflow-hidden">
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Code</th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Discount</th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Uses</th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Status</th>
                      <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {coupons.map((c) => {
                      const isExpired = c.expiryDate && new Date(c.expiryDate) < new Date();
                      const isMaxed = c.maxUses !== null && c.currentUses >= c.maxUses;
                      const status = isExpired ? 'Expired' : isMaxed ? 'Max Uses Reached' : 'Active';
                      return (
                        <tr key={c.id}>
                          <td className="px-4 py-3 whitespace-nowrap text-sm font-medium text-gray-900">{c.code}</td>
                          <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-500">
                            {c.discountType === 'FIXED' ? '$' : ''}{c.discountAmount}{c.discountType === 'PERCENT' ? '%' : ''}
                          </td>
                          <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-500">
                            {c.currentUses} / {c.maxUses === null ? '∞' : c.maxUses}
                          </td>
                          <td className="px-4 py-3 whitespace-nowrap">
                            <span className={`px-2 py-1 text-[10px] rounded-full uppercase font-bold ${status === 'Active' ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}`}>
                              {status}
                            </span>
                          </td>
                          <td className="px-4 py-3 whitespace-nowrap text-right text-sm font-medium">
                            <button onClick={() => handleEditCoupon(c)} className="text-primary-600 hover:text-primary-900 mr-3">Edit</button>
                            <button onClick={() => handleDeleteCoupon(c.id)} className="text-red-600 hover:text-red-900">Delete</button>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>

        <div className="border-b pb-6">
          <h3 className="text-lg font-medium text-gray-900 mb-4">
            Membership Plans
          </h3>
          <p className="text-sm text-gray-500 mb-6">
            Manage the membership types and prices available for registration.
            Archived plans cannot be selected by new members.
          </p>

          <div className="space-y-4 mb-8">
            {plans.map((plan) => (
              <div
                key={plan.id}
                className={`p-4 border rounded-md shadow-sm ${plan.isArchived ? "bg-gray-50 border-gray-400" : "bg-white border-gray-300"}`}
              >
                {editingPlanId === plan.id ? (
                  <div className="flex flex-col space-y-3">
                    <div className="flex items-center space-x-3">
                      <input
                        className="border border-gray-300 rounded-md px-3 py-1.5 text-sm flex-1"
                        value={editPlanForm.name || ""}
                        onChange={(e) =>
                          setEditPlanForm({
                            ...editPlanForm,
                            name: e.target.value,
                          })
                        }
                        placeholder="Plan Name"
                      />
                      <input
                        type="number"
                        className="border border-gray-300 rounded-md px-3 py-1.5 text-sm w-32"
                        value={editPlanForm.cost || 0}
                        onChange={(e) =>
                          setEditPlanForm({
                            ...editPlanForm,
                            cost: parseFloat(e.target.value) || 0,
                          })
                        }
                        placeholder="Cost ($)"
                      />
                    </div>
                    <input
                      className="border border-gray-300 rounded-md px-3 py-1.5 text-sm w-full"
                      value={editPlanForm.description || ""}
                      onChange={(e) =>
                        setEditPlanForm({
                          ...editPlanForm,
                          description: e.target.value,
                        })
                      }
                      placeholder="Description (Optional)"
                    />
                    <div className="flex justify-end space-x-2 pt-2">
                      <button
                        onClick={() => setEditingPlanId(null)}
                        className="px-3 py-1.5 text-sm text-gray-600 hover:bg-gray-100 rounded-md border border-gray-300"
                      >
                        Cancel
                      </button>
                      <button
                        onClick={handleSaveEditPlan}
                        className="px-3 py-1.5 text-sm text-white bg-blue-600 hover:bg-blue-700 rounded-md shadow-sm"
                      >
                        Save
                      </button>
                    </div>
                  </div>
                ) : (
                  <div className="flex items-center justify-between">
                    <div>
                      <div className="flex items-center gap-2 mb-1">
                        <h4
                          className={`font-semibold ${plan.isArchived ? "text-gray-500" : "text-gray-900"}`}
                        >
                          {plan.name}
                        </h4>
                        <span className="text-sm font-medium text-green-600">
                          ${plan.cost}
                        </span>
                        {plan.isArchived && (
                          <span className="text-xs bg-gray-200 text-gray-700 px-2 py-0.5 rounded-full font-medium">
                            Archived
                          </span>
                        )}
                      </div>
                      <p className="text-sm text-gray-500">
                        {plan.description || "No description provided."}
                      </p>
                    </div>
                    <div className="flex space-x-2">
                      <button
                        onClick={() => handleStartEditPlan(plan)}
                        className="text-sm text-blue-600 hover:text-blue-800 px-2 py-1"
                      >
                        Edit
                      </button>
                      <button
                        onClick={() => handleToggleArchivePlan(plan)}
                        className={`text-sm px-2 py-1 ${plan.isArchived ? "text-green-600 hover:text-green-800" : "text-orange-600 hover:text-orange-800"}`}
                      >
                        {plan.isArchived ? "Unarchive" : "Archive"}
                      </button>
                    </div>
                  </div>
                )}
              </div>
            ))}

            {plans.length === 0 && (
              <p className="text-sm text-gray-500 italic">
                No membership plans found.
              </p>
            )}
          </div>

          <div className="bg-gray-50 p-4 border border-gray-400 rounded-md shadow-sm">
            <div className="flex justify-between items-center mb-3">
              <h4 className="text-sm font-medium text-gray-900">
                Add New Membership Plan
              </h4>
              <button
                onClick={() => setShowAddPlan(!showAddPlan)}
                className="text-primary-600 text-sm font-medium hover:text-primary-800"
              >
                {showAddPlan ? "Cancel" : "+ Add Plan"}
              </button>
            </div>
            {showAddPlan && (
              <div className="flex flex-col space-y-3">
                <div className="flex items-center space-x-3">
                  <input
                    className="border border-gray-300 rounded-md px-3 py-1.5 text-sm flex-1"
                    value={newPlan.name}
                    onChange={(e) =>
                      setNewPlan({ ...newPlan, name: e.target.value })
                    }
                    placeholder="Plan Name (e.g. Young Adult)"
                  />
                  <input
                    type="number"
                    min="0"
                    className="border border-gray-300 rounded-md px-3 py-1.5 text-sm w-32"
                    value={newPlan.cost}
                    onChange={(e) =>
                      setNewPlan({
                        ...newPlan,
                        cost: parseFloat(e.target.value) || 0,
                      })
                    }
                    placeholder="Cost ($)"
                  />
                </div>
                <input
                  className="border border-gray-300 rounded-md px-3 py-1.5 text-sm w-full"
                  value={newPlan.description}
                  onChange={(e) =>
                    setNewPlan({ ...newPlan, description: e.target.value })
                  }
                  placeholder="Description (Optional)"
                />
                <div className="flex justify-end pt-1">
                  <button
                    onClick={() => {
                      handleSaveNewPlan();
                      setShowAddPlan(false);
                    }}
                    disabled={savingPlan || !newPlan.name}
                    className="px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-primary-600 hover:bg-primary-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {savingPlan ? "Adding..." : "Add Plan"}
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>

        <div className="pt-6 border-t mt-6">
          <h3 className="text-lg font-medium text-gray-900 mb-4">
            Booking Types
          </h3>
          <p className="text-sm text-gray-500 mb-6">
            Manage the types of bookings available and customize their calendar
            colors. "MEMBER" is a required system type that asks for playing
            partners.
          </p>
          <div className="space-y-4 mb-6">
            {bookingTypesLoading ? (
              <p className="text-sm text-gray-500">Loading booking types...</p>
            ) : (
              bookingTypes.map((bt) => (
                <div
                  key={bt.id}
                  className="border border-gray-400 rounded-md p-4 flex justify-between items-center bg-gray-50"
                >
                  {editingBookingTypeId === bt.id ? (
                    <div className="w-full flex flex-col space-y-3">
                      <div className="flex items-center space-x-3">
                        <input
                          className="border border-gray-300 rounded-md px-2 py-1 text-sm font-medium text-gray-900 flex-1 uppercase"
                          value={editBookingTypeForm.name || ""}
                          onChange={(e) =>
                            setEditBookingTypeForm({
                              ...editBookingTypeForm,
                              name: e.target.value,
                            })
                          }
                          placeholder="Booking Type Name"
                          disabled={bt.isBuiltIn}
                          title={
                            bt.isBuiltIn ? "Cannot rename built-in types" : ""
                          }
                        />
                        <input
                          type="color"
                          className="border border-gray-300 rounded-md h-8 w-12 cursor-pointer p-0.5"
                          value={editBookingTypeForm.color || "#3b82f6"}
                          onChange={(e) =>
                            setEditBookingTypeForm({
                              ...editBookingTypeForm,
                              color: e.target.value,
                            })
                          }
                        />
                      </div>
                      <div className="flex flex-col space-y-2 mt-2 bg-white p-3 rounded border border-gray-200">
                        <label className="flex items-center space-x-2 text-sm text-gray-700">
                          <input type="checkbox" checked={editBookingTypeForm.allowMemberRegistration || false} onChange={e => setEditBookingTypeForm({...editBookingTypeForm, allowMemberRegistration: e.target.checked})} className="rounded text-primary-600 focus:ring-primary-500 h-4 w-4" />
                          <span>Allow Member Registration (Block Bookings)</span>
                        </label>
                        {editBookingTypeForm.allowMemberRegistration && (
                          <div className="grid grid-cols-3 gap-3 pt-2">
                            <div>
                              <label className="block text-xs text-gray-500 mb-1">Min Participants</label>
                              <input type="number" value={editBookingTypeForm.minParticipants || ""} onChange={e => setEditBookingTypeForm({...editBookingTypeForm, minParticipants: e.target.value})} className="w-full border border-gray-300 rounded px-2 py-1 text-sm" placeholder="No min" />
                            </div>
                            <div>
                              <label className="block text-xs text-gray-500 mb-1">Max Participants</label>
                              <input type="number" value={editBookingTypeForm.maxParticipants || ""} onChange={e => setEditBookingTypeForm({...editBookingTypeForm, maxParticipants: e.target.value})} className="w-full border border-gray-300 rounded px-2 py-1 text-sm" placeholder="No max" />
                            </div>
                            <div>
                              <label className="block text-xs text-gray-500 mb-1">Default Offline Fee ($)</label>
                              <input type="number" step="0.01" value={editBookingTypeForm.defaultCost || ""} onChange={e => setEditBookingTypeForm({...editBookingTypeForm, defaultCost: e.target.value})} className="w-full border border-gray-300 rounded px-2 py-1 text-sm" placeholder="0.00" />
                            </div>
                          </div>
                        )}
                      </div>
                      <div className="flex space-x-2 pt-2">
                        <button
                          onClick={handleSaveEditBookingType}
                          className="text-primary-600 hover:text-primary-900 text-sm font-medium"
                        >
                          Save
                        </button>
                        <button
                          onClick={() => setEditingBookingTypeId(null)}
                          className="text-gray-500 hover:text-gray-700 text-sm font-medium"
                        >
                          Cancel
                        </button>
                      </div>
                    </div>
                  ) : (
                    <>
                      <div className="flex items-center space-x-3">
                        <div
                          className="w-6 h-6 rounded border border-gray-300"
                          style={{ backgroundColor: bt.color }}
                        ></div>
                        <h4 className="text-base font-medium text-gray-900">
                          {bt.name}
                        </h4>
                        {bt.isBuiltIn && (
                          <span className="px-2 py-0.5 rounded text-xs font-medium bg-gray-200 text-gray-600">
                            System
                          </span>
                        )}
                      </div>
                      <div className="flex space-x-3">
                        <button
                          onClick={() => handleStartEditBookingType(bt)}
                          className="text-primary-600 hover:text-primary-900 text-sm font-medium"
                        >
                          Edit
                        </button>
                        {!bt.isBuiltIn && (
                          <button
                            onClick={() => handleDeleteBookingType(bt)}
                            className="text-red-600 hover:text-red-900 text-sm font-medium"
                          >
                            Delete
                          </button>
                        )}
                      </div>
                    </>
                  )}
                </div>
              ))
            )}
            {!bookingTypesLoading && bookingTypes.length === 0 && (
              <p className="text-sm text-gray-500 italic">
                No booking types found.
              </p>
            )}
          </div>

          <div className="bg-gray-50 p-4 border border-gray-400 rounded-md shadow-sm">
            <div className="flex justify-between items-center mb-3">
              <h4 className="text-sm font-medium text-gray-900">
                Add New Booking Type
              </h4>
              <button
                onClick={() => setShowAddBookingType(!showAddBookingType)}
                className="text-primary-600 text-sm font-medium hover:text-primary-800"
              >
                {showAddBookingType ? "Cancel" : "+ Add Booking Type"}
              </button>
            </div>
            {showAddBookingType && (
              <div className="flex flex-col space-y-3">
                <div className="flex items-center space-x-3">
                  <input
                    className="border border-gray-300 rounded-md px-3 py-1.5 text-sm flex-1 uppercase"
                    value={newBookingType.name}
                    onChange={(e) =>
                      setNewBookingType({
                        ...newBookingType,
                        name: e.target.value,
                      })
                    }
                    placeholder="Name (e.g. TOURNAMENT)"
                  />
                  <input
                    type="color"
                    className="border border-gray-300 rounded-md h-9 w-14 cursor-pointer p-0.5"
                    value={newBookingType.color}
                    onChange={(e) =>
                      setNewBookingType({
                        ...newBookingType,
                        color: e.target.value,
                      })
                    }
                    title="Calendar Color"
                  />
                </div>
                <div className="flex flex-col space-y-2 mt-2 bg-white p-3 rounded border border-gray-200">
                  <label className="flex items-center space-x-2 text-sm text-gray-700">
                    <input type="checkbox" checked={newBookingType.allowMemberRegistration || false} onChange={e => setNewBookingType({...newBookingType, allowMemberRegistration: e.target.checked})} className="rounded text-primary-600 focus:ring-primary-500 h-4 w-4" />
                    <span>Allow Member Registration (Block Bookings)</span>
                  </label>
                  {newBookingType.allowMemberRegistration && (
                    <div className="grid grid-cols-3 gap-3 pt-2">
                      <div>
                        <label className="block text-xs text-gray-500 mb-1">Min Participants</label>
                        <input type="number" value={newBookingType.minParticipants || ""} onChange={e => setNewBookingType({...newBookingType, minParticipants: e.target.value})} className="w-full border border-gray-300 rounded px-2 py-1 text-sm" placeholder="No min" />
                      </div>
                      <div>
                        <label className="block text-xs text-gray-500 mb-1">Max Participants</label>
                        <input type="number" value={newBookingType.maxParticipants || ""} onChange={e => setNewBookingType({...newBookingType, maxParticipants: e.target.value})} className="w-full border border-gray-300 rounded px-2 py-1 text-sm" placeholder="No max" />
                      </div>
                      <div>
                        <label className="block text-xs text-gray-500 mb-1">Default Offline Fee ($)</label>
                        <input type="number" step="0.01" value={newBookingType.defaultCost || ""} onChange={e => setNewBookingType({...newBookingType, defaultCost: e.target.value})} className="w-full border border-gray-300 rounded px-2 py-1 text-sm" placeholder="0.00" />
                      </div>
                    </div>
                  )}
                </div>
                <div className="flex justify-end pt-1">
                  <button
                    onClick={() => {
                      handleSaveNewBookingType();
                      setShowAddBookingType(false);
                    }}
                    disabled={savingBookingType || !newBookingType.name}
                    className="px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-primary-600 hover:bg-primary-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {savingBookingType ? "Adding..." : "Add Type"}
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>

        <div className="border-t pt-6 mt-6">
          <h3 className="text-lg font-medium text-gray-900 mb-4">
            Email Templates
          </h3>
          <p className="text-sm text-gray-500 mb-6">
            Customize the automated emails sent to your members. Use HTML
            formatting.
          </p>

          <div className="bg-gray-50 p-4 border border-gray-400 rounded-md shadow-sm">
            <div className="mb-4">
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Select Email to Edit
              </label>
              <select
                className="border border-gray-300 rounded-md px-3 py-2 text-sm w-full bg-white"
                value={selectedTemplateId}
                onChange={(e) => handleTemplateSelect(e.target.value)}
              >
                <option value="">-- Select a template --</option>
                <option value="WELCOME_EMAIL">Welcome Email</option>
                <option value="REGISTRATION_PENDING">
                  Registration Pending
                </option>
                <option value="PROFILE_UPDATED">Profile Updated</option>
                <option value="BOOKING_CONFIRMATION">
                  Booking Confirmation
                </option>
                <option value="INTEREST_CONFIRMATION">
                  Interest Confirmation
                </option>
                <option value="ADMIN_NEW_REGISTRATION">
                  Admin Alert: New Registration
                </option>
                <option value="IMPORT_WELCOME_EMAIL">
                  Import Welcome Email
                </option>
              </select>
            </div>

            {selectedTemplateId && (
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Email Subject
                  </label>
                  <input
                    className="border border-gray-300 rounded-md px-3 py-2 text-sm w-full"
                    value={editTemplateForm.subject || ""}
                    onChange={(e) =>
                      setEditTemplateForm({
                        ...editTemplateForm,
                        subject: e.target.value,
                      })
                    }
                    placeholder="Enter email subject..."
                  />
                </div>
                <div>
                  <div className="flex justify-between items-end mb-1">
                    <label className="block text-sm font-medium text-gray-700">
                      HTML Body
                    </label>
                    <div className="flex items-center gap-2">
                      <select
                        className="text-xs border border-primary-200 rounded px-2 py-1 bg-primary-50 text-primary-700 focus:ring-primary-500 focus:border-primary-500 cursor-pointer font-medium"
                        onChange={(e) => {
                          insertVariable(e.target.value);
                          e.target.value = ""; // reset dropdown
                        }}
                        defaultValue=""
                      >
                        <option value="" disabled>
                          + Insert variable...
                        </option>
                        {TEMPLATE_VARIABLES[selectedTemplateId]?.map((v) => (
                          <option key={v} value={v}>
                            {v}
                          </option>
                        ))}
                      </select>
                    </div>
                  </div>
                  <div className="flex justify-end gap-4 mb-2">
                    <button
                      onClick={() => setEditorMode("visual")}
                      className={`text-xs font-medium ${editorMode === "visual" ? "text-primary-700 font-bold" : "text-gray-500 hover:text-gray-700 underline"}`}
                    >
                      Visual Editor
                    </button>
                    <button
                      onClick={() => setEditorMode("raw")}
                      className={`text-xs font-medium ${editorMode === "raw" ? "text-primary-700 font-bold" : "text-gray-500 hover:text-gray-700 underline"}`}
                    >
                      Raw HTML
                    </button>
                    <button
                      onClick={() => setEditorMode("preview")}
                      className={`text-xs font-medium ${editorMode === "preview" ? "text-primary-700 font-bold" : "text-gray-500 hover:text-gray-700 underline"}`}
                    >
                      Preview
                    </button>
                  </div>
                  {editorMode === "visual" && (
                    <div className="bg-white">
                      <TipTapEditor
                        value={editTemplateForm.htmlBody || ""}
                        onChange={(val: string) =>
                          setEditTemplateForm({
                            ...editTemplateForm,
                            htmlBody: val,
                          })
                        }
                        onEditorReady={setEditorInstance}
                      />
                    </div>
                  )}
                  {editorMode === "raw" && (
                    <textarea
                      ref={textareaRef}
                      className="border border-gray-300 rounded-md px-3 py-2 text-sm w-full font-mono h-64 focus:ring-primary-500 focus:border-primary-500"
                      value={editTemplateForm.htmlBody || ""}
                      onChange={(e) =>
                        setEditTemplateForm({
                          ...editTemplateForm,
                          htmlBody: e.target.value,
                        })
                      }
                      placeholder="<p>Write your custom HTML email here...</p>"
                    />
                  )}
                  {editorMode === "preview" && (
                    <div className="border border-gray-300 rounded-md p-4 bg-white min-h-[300px] overflow-x-auto break-words">
                      <div
                        dangerouslySetInnerHTML={{
                          __html: Object.keys(MOCK_VARIABLES).reduce(
                            (html, key) =>
                              html.replaceAll(key, MOCK_VARIABLES[key]),
                            editTemplateForm.htmlBody || "",
                          ),
                        }}
                      />
                    </div>
                  )}
                </div>
                <div className="flex justify-between items-center mt-2">
                  <button
                    onClick={handleResetTemplate}
                    disabled={savingTemplate}
                    className="px-4 py-2 text-sm font-medium text-red-600 hover:text-red-700 focus:outline-none"
                  >
                    Reset to Default
                  </button>
                  <button
                    onClick={handleSaveTemplate}
                    disabled={
                      savingTemplate ||
                      !editTemplateForm.subject ||
                      !editTemplateForm.htmlBody
                    }
                    className="px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-primary-600 hover:bg-primary-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500 disabled:opacity-50"
                  >
                    {savingTemplate ? "Saving..." : "Save Template"}
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>

        <div className="border-t pt-6 mt-6 pb-6">
          <h3 className="text-lg font-medium text-gray-900 mb-4">
            Website & Branding
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
            <div className="flex flex-col space-y-2">
              <label className="text-sm font-medium text-gray-700">
                Primary Brand Colour
              </label>
              <p className="text-sm text-gray-500 mb-2">
                The main colour used for buttons, links, and highlights across
                the entire app.
              </p>
              <div className="flex items-center space-x-3">
                <input
                  type="color"
                  value={primaryColor}
                  onChange={(e) => setPrimaryColor(e.target.value)}
                  className="block h-10 w-20 cursor-pointer rounded border border-gray-300 shadow-sm"
                />
                <span className="text-gray-600 font-mono text-sm">
                  {primaryColor.toUpperCase()}
                </span>
              </div>
            </div>

            <div className="flex flex-col space-y-2">
              <label className="text-sm font-medium text-gray-700">
                Secondary Color
              </label>
              <p className="text-xs text-gray-500 mb-2">
                Used for accents, success states, and secondary buttons.
              </p>
              <div className="flex items-center space-x-3">
                <input
                  type="color"
                  value={secondaryColor}
                  onChange={(e) => { setSecondaryColor(e.target.value); setIsDirty(true); }}
                  className="block h-10 w-20 cursor-pointer rounded border border-gray-300 shadow-sm"
                />
                <span className="text-gray-600 font-mono text-sm">
                  {secondaryColor.toUpperCase()}
                </span>
              </div>
            </div>

            <div className="flex flex-col space-y-2 md:col-span-2">
              <label className="text-sm font-medium text-gray-700">
                Font Family
              </label>
              <select
                value={fontFamily}
                onChange={(e) => { setFontFamily(e.target.value); setIsDirty(true); }}
                className="block w-full max-w-sm rounded-md border-gray-300 shadow-sm focus:border-primary-500 focus:ring-primary-500 sm:text-sm"
              >
                <option value="Inter">Inter (Modern, Clean)</option>
                <option value="Roboto">Roboto (Classic, Readable)</option>
                <option value="Outfit">Outfit (Geometric, Trendy)</option>
                <option value="Playfair Display">Playfair Display (Elegant, Serif)</option>
                <option value="Montserrat">Montserrat (Wide, Professional)</option>
              </select>
            </div>

            <div className="flex flex-col space-y-2 md:col-span-2">
              <label className="text-sm font-medium text-gray-700">
                Hero Image URL
              </label>
              <p className="text-xs text-gray-500 mb-1">
                Enter a link to a high-quality image to display on the landing page. Leave blank to use the default image.
              </p>
              <input
                type="text"
                placeholder="https://example.com/my-club-hero.jpg"
                value={heroImageUrl}
                onChange={(e) => { setHeroImageUrl(e.target.value); setIsDirty(true); }}
                className="block w-full rounded-md border-gray-300 shadow-sm focus:border-primary-500 focus:ring-primary-500 sm:text-sm"
              />
              {heroImageUrl && (
                <div className="mt-3 relative h-32 w-full max-w-md rounded-md overflow-hidden border border-gray-200">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={heroImageUrl} alt="Hero Preview" className="absolute inset-0 w-full h-full object-cover" onError={(e) => { (e.target as HTMLImageElement).src = 'https://placehold.co/600x400?text=Invalid+Image+URL' }} />
                </div>
              )}
            </div>

            <div className="flex flex-col space-y-2 md:col-span-2 mt-6 pt-6 border-t border-gray-200">
              <h4 className="text-md font-medium text-gray-900">Promotional Showcase</h4>
              <p className="text-xs text-gray-500 mb-2">
                Display an event flyer or promotional banner on your homepage. Leave blank to hide.
              </p>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="flex flex-col space-y-2">
                  <label className="text-sm font-medium text-gray-700">Promo Image URL</label>
                  <input
                    type="text"
                    placeholder="https://example.com/tournament-flyer.png"
                    value={promoImageUrl}
                    onChange={(e) => { setPromoImageUrl(e.target.value); setIsDirty(true); }}
                    className="block w-full rounded-md border-gray-300 shadow-sm focus:border-primary-500 focus:ring-primary-500 sm:text-sm"
                  />
                  {promoImageUrl && (
                    <div className="mt-2 relative h-32 w-full max-w-sm rounded-md overflow-hidden border border-gray-200 bg-gray-100">
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img src={promoImageUrl} alt="Promo Preview" className="absolute inset-0 w-full h-full object-contain" onError={(e) => { (e.target as HTMLImageElement).src = 'https://placehold.co/600x400?text=Invalid+Image+URL' }} />
                    </div>
                  )}
                </div>

                <div className="flex flex-col space-y-2">
                  <label className="text-sm font-medium text-gray-700">Promo Link URL (Optional)</label>
                  <input
                    type="text"
                    placeholder="https://example.com/register"
                    value={promoLinkUrl}
                    onChange={(e) => { setPromoLinkUrl(e.target.value); setIsDirty(true); }}
                    className="block w-full rounded-md border-gray-300 shadow-sm focus:border-primary-500 focus:ring-primary-500 sm:text-sm"
                  />
                  <p className="text-xs text-gray-500">If provided, clicking the promo image will send the user here.</p>
                </div>
              </div>
            </div>
          </div>

          <h4 className="text-md font-medium text-gray-900 mb-4">
            Landing Page Content
          </h4>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
            <div className="flex flex-col space-y-2">
              <label className="text-sm font-medium text-gray-700">Hero Title</label>
              <input type="text" value={heroTitle} onChange={(e) => setHeroTitle(e.target.value)} className="block w-full rounded-md border-gray-300 shadow-sm focus:border-primary-500 focus:ring-primary-500 p-2 border" />
            </div>
            <div className="flex flex-col space-y-2">
              <label className="text-sm font-medium text-gray-700">Hero Subtitle</label>
              <textarea value={heroSubtitle} onChange={(e) => setHeroSubtitle(e.target.value)} className="block w-full rounded-md border-gray-300 shadow-sm focus:border-primary-500 focus:ring-primary-500 p-2 border" rows={3}></textarea>
            </div>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="flex flex-col space-y-2">
              <label className="text-sm font-medium text-gray-700">Feature 1 Title</label>
              <input type="text" value={feature1Title} onChange={(e) => setFeature1Title(e.target.value)} className="block w-full rounded-md border-gray-300 shadow-sm focus:border-primary-500 focus:ring-primary-500 p-2 border" />
              <label className="text-sm font-medium text-gray-700 mt-2">Feature 1 Description</label>
              <textarea value={feature1Desc} onChange={(e) => setFeature1Desc(e.target.value)} className="block w-full rounded-md border-gray-300 shadow-sm focus:border-primary-500 focus:ring-primary-500 p-2 border" rows={3}></textarea>
            </div>
            <div className="flex flex-col space-y-2">
              <label className="text-sm font-medium text-gray-700">Feature 2 Title</label>
              <input type="text" value={feature2Title} onChange={(e) => setFeature2Title(e.target.value)} className="block w-full rounded-md border-gray-300 shadow-sm focus:border-primary-500 focus:ring-primary-500 p-2 border" />
              <label className="text-sm font-medium text-gray-700 mt-2">Feature 2 Description</label>
              <textarea value={feature2Desc} onChange={(e) => setFeature2Desc(e.target.value)} className="block w-full rounded-md border-gray-300 shadow-sm focus:border-primary-500 focus:ring-primary-500 p-2 border" rows={3}></textarea>
            </div>
            <div className="flex flex-col space-y-2">
              <label className="text-sm font-medium text-gray-700">Feature 3 Title</label>
              <input type="text" value={feature3Title} onChange={(e) => setFeature3Title(e.target.value)} className="block w-full rounded-md border-gray-300 shadow-sm focus:border-primary-500 focus:ring-primary-500 p-2 border" />
              <label className="text-sm font-medium text-gray-700 mt-2">Feature 3 Description</label>
              <textarea value={feature3Desc} onChange={(e) => setFeature3Desc(e.target.value)} className="block w-full rounded-md border-gray-300 shadow-sm focus:border-primary-500 focus:ring-primary-500 p-2 border" rows={3}></textarea>
            </div>
          </div>
        </div>
        <div className="border-b pb-6">
          <h3 className="text-lg font-medium text-gray-900 mb-4">
            Website Pages Manager
          </h3>
          <p className="text-sm text-gray-500 mb-4">Create dynamic, custom pages for your website (e.g. "About Us", "Club Rules").</p>
          
          <div className="space-y-4 mb-6">
            {pagesLoading ? (
              <p className="text-sm text-gray-500">Loading pages...</p>
            ) : (
              customPages.map(page => (
                <div key={page.id} className="flex justify-between items-center bg-gray-50 p-3 rounded border border-gray-200">
                  <div>
                    <h4 className="font-medium text-gray-900 flex items-center gap-2">
                      {page.title}
                      {!page.isPublic && (
                        <svg className="w-4 h-4 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z"></path></svg>
                      )}
                    </h4>
                    <p className="text-xs text-gray-500">/p/{page.slug} • {page.isPublished ? 'Published' : 'Draft'}</p>
                  </div>
                  <div className="flex space-x-3">
                    <button onClick={() => handleStartEditPage(page)} className="text-primary-600 hover:text-primary-900 text-sm font-medium">Edit</button>
                    <button onClick={() => handleDeletePage(page.id)} className="text-red-600 hover:text-red-900 text-sm font-medium">Delete</button>
                  </div>
                </div>
              ))
            )}
            {!pagesLoading && customPages.length === 0 && (
              <p className="text-sm text-gray-500 italic">No custom pages created yet.</p>
            )}
          </div>

          <div className="bg-gray-50 p-4 border border-gray-400 rounded-md shadow-sm">
            <div className="flex justify-between items-center mb-3">
              <h4 className="text-sm font-medium text-gray-900">
                {editingPageId ? 'Edit Page' : 'Add New Page'}
              </h4>
              <button
                onClick={() => {
                  setShowAddPage(!showAddPage);
                  if (editingPageId) {
                    setEditingPageId(null);
                    setPageForm({});
                  }
                }}
                className="text-primary-600 text-sm font-medium hover:text-primary-800"
              >
                {showAddPage ? "Cancel" : "+ Add Page"}
              </button>
            </div>
            {showAddPage && (
              <div className="flex flex-col space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Page Title</label>
                    <input type="text" value={pageForm.title || ''} onChange={e => setPageForm({...pageForm, title: e.target.value})} className="w-full border border-gray-300 rounded px-3 py-2 text-sm" placeholder="e.g. Club Rules" />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">URL Slug</label>
                    <div className="flex items-center">
                      <span className="text-gray-500 text-sm bg-gray-100 border border-r-0 border-gray-300 rounded-l px-3 py-2">/p/</span>
                      <input type="text" value={pageForm.slug || ''} onChange={e => setPageForm({...pageForm, slug: e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, '-')})} className="flex-1 border border-gray-300 rounded-r px-3 py-2 text-sm" placeholder="e.g. club-rules" />
                    </div>
                  </div>
                </div>
                
                <div className="flex space-x-6 border-t pt-4">
                  <label className="flex items-center space-x-2">
                    <input type="checkbox" checked={pageForm.isPublished ?? true} onChange={e => setPageForm({...pageForm, isPublished: e.target.checked})} className="rounded text-primary-600 focus:ring-primary-500" />
                    <span className="text-sm text-gray-700">Published (Visible on site)</span>
                  </label>
                  <label className="flex items-center space-x-2">
                    <input type="checkbox" checked={pageForm.isPublic ?? true} onChange={e => setPageForm({...pageForm, isPublic: e.target.checked})} className="rounded text-primary-600 focus:ring-primary-500" />
                    <span className="text-sm text-gray-700">Public (Uncheck for Members Only access)</span>
                  </label>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Page Content</label>
                  <TipTapEditor
                    value={pageForm.contentHtml || ""}
                    onChange={(html) => setPageForm({...pageForm, contentHtml: html})}
                  />
                </div>

                <div className="flex justify-end pt-2">
                  <button
                    onClick={handleSavePage}
                    disabled={savingPage}
                    className="px-4 py-2 bg-primary-600 text-white rounded shadow-sm hover:bg-primary-700 font-medium text-sm disabled:opacity-50"
                  >
                    {savingPage ? 'Saving...' : 'Save Page'}
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>

        <div className="flex items-center space-x-4">
          <button
            onClick={handleSave}
            disabled={!isDirty || saving}
            className="px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-primary-600 hover:bg-primary-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500 disabled:opacity-50"
          >
            {saving ? "Saving..." : "Save Settings"}
          </button>
          {message && (
            <span
              className={
                message.includes("success")
                  ? "text-green-600 text-sm font-medium"
                  : "text-red-600 text-sm font-medium"
              }
            >
              {message}
            </span>
          )}
        </div>

        <div className="border-t border-red-200 pt-6 mt-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-medium text-red-700 flex items-center">
              <svg
                className="w-5 h-5 mr-2"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
                xmlns="http://www.w3.org/2000/svg"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
                />
              </svg>
              Danger Zone
            </h3>
            <button
              onClick={() => setShowDangerZone(!showDangerZone)}
              className="px-3 py-1 text-sm font-medium text-red-600 bg-red-50 hover:bg-red-100 rounded-md transition-colors"
            >
              {showDangerZone ? "Hide Danger Zone" : "Show Danger Zone"}
            </button>
          </div>
          {showDangerZone && (
            <div className="bg-red-50 p-4 border border-red-200 rounded-md shadow-sm">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between border-b border-red-200 pb-4 mb-4">
              <div>
                <h4 className="text-sm font-bold text-red-900">
                  Wipe All Bookings
                </h4>
                <p className="text-sm text-red-700 mt-1">
                  Permanently delete all court bookings from the system. This
                  action cannot be undone.
                </p>
              </div>
              <button
                onClick={handleWipeBookings}
                disabled={wiping || wipingSystem}
                className="mt-4 sm:mt-0 px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-red-600 hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500 disabled:opacity-50 whitespace-nowrap"
              >
                {wiping ? "Wiping..." : "Wipe Bookings"}
              </button>
            </div>

            <div className="flex flex-col sm:flex-row sm:items-center justify-between">
              <div>
                <h4 className="text-sm font-bold text-red-900">
                  Total System Wipe
                </h4>
                <p className="text-sm text-red-700 mt-1">
                  Permanently delete ALL users, members, leads, and member bookings. 
                  Only your Super Admin account, settings, coupons, events, and non-member bookings will survive.
                </p>
              </div>
              <button
                onClick={handleWipeSystem}
                disabled={wiping || wipingSystem}
                className="mt-4 sm:mt-0 px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-bold text-white bg-red-800 hover:bg-red-900 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-900 disabled:opacity-50 whitespace-nowrap"
              >
                {wipingSystem ? "Wiping System..." : "WIPE SYSTEM"}
              </button>
            </div>
          </div>
          )}
        </div>
      </div>

      {showTopBtn && (
        <button
          onClick={() => window.scrollTo({ top: 0, behavior: "smooth" })}
          className="fixed bottom-8 right-8 bg-gray-800 text-white p-3 rounded-full shadow-lg hover:bg-gray-700 transition-colors focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-gray-800 z-50"
          title="Back to top"
        >
          <svg
            className="w-5 h-5"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
            xmlns="http://www.w3.org/2000/svg"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M5 10l7-7m0 0l7 7m-7-7v18"
            />
          </svg>
        </button>
      )}
    </div>
  );
}
