import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { checkAdmin } from '@/lib/check-admin';

export const dynamic = 'force-dynamic';

export async function GET(req: Request) {
  try {
    const adminCheck = await checkAdmin('MANAGE_SETTINGS');
    if (adminCheck.error) return NextResponse.json({ error: adminCheck.error }, { status: adminCheck.status });

    let settings = await prisma.systemSetting.findUnique({
      where: { id: 'global' }
    });

    if (!settings) {
      settings = await prisma.systemSetting.create({
        data: { id: 'global', cancellationCutoffMinutes: 90, maxHoursPerDay: 2, maxDaysInAdvance: 3, courtOpenTime: 6, courtCloseTime: 23, calendarDaysToShow: 3, calendarSkipDays: 1, primaryColor: '#4f46e5', activeSeason: '2026', genderOptions: ['Male', 'Female', 'Prefer not to say'] }
      });
    }

    return NextResponse.json({ 
      settings,
      isSuperAdmin: adminCheck.user?.isSuperAdmin || false 
    }, { status: 200 });
  } catch (error) {
    console.error('Fetch settings error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function PUT(req: Request) {
  try {
    const adminCheck = await checkAdmin('MANAGE_SETTINGS');
    if (adminCheck.error) return NextResponse.json({ error: adminCheck.error }, { status: adminCheck.status });

    const { cancellationCutoffMinutes, maxHoursPerDay, maxDaysInAdvance, courtOpenTime, courtCloseTime, calendarDaysToShow, calendarSkipDays, primaryColor, secondaryColor, fontFamily, heroImageUrl, promoImageUrl, promoLinkUrl, externalWebsiteUrl, logoUrl, simpleLandingPage, landingPageTheme, activeSeason, genderOptions, navigationLinks, enableCsvImport, enableWelcomeEmails, enableMemberCourtBooking, enableQrCheckIn, requireGpsCheckIn, clubLatitude, clubLongitude, heroTitle, heroSubtitle, feature1Title, feature1Desc, feature2Title, feature2Desc, feature3Title, feature3Desc } = await req.json();

    const updateData: any = {};
    if (typeof cancellationCutoffMinutes === 'number') updateData.cancellationCutoffMinutes = cancellationCutoffMinutes;
    if (typeof maxHoursPerDay === 'number') updateData.maxHoursPerDay = maxHoursPerDay;
    if (typeof maxDaysInAdvance === 'number') updateData.maxDaysInAdvance = maxDaysInAdvance;
    if (typeof courtOpenTime === 'number') updateData.courtOpenTime = courtOpenTime;
    if (typeof courtCloseTime === 'number') updateData.courtCloseTime = courtCloseTime;
    if (typeof calendarDaysToShow === 'number') updateData.calendarDaysToShow = calendarDaysToShow;
    if (typeof calendarSkipDays === 'number') updateData.calendarSkipDays = calendarSkipDays;
    if (typeof primaryColor === 'string') updateData.primaryColor = primaryColor;
    if (typeof secondaryColor === 'string') updateData.secondaryColor = secondaryColor;
    if (typeof fontFamily === 'string') updateData.fontFamily = fontFamily;
    if (heroImageUrl === null || typeof heroImageUrl === 'string') updateData.heroImageUrl = heroImageUrl;
    if (promoImageUrl === null || typeof promoImageUrl === 'string') updateData.promoImageUrl = promoImageUrl;
    if (promoLinkUrl === null || typeof promoLinkUrl === 'string') updateData.promoLinkUrl = promoLinkUrl;
    if (logoUrl === null || typeof logoUrl === 'string') updateData.logoUrl = logoUrl;
    
    // Only SUPER_ADMIN can change the externalWebsiteUrl
    if (adminCheck.user?.isSuperAdmin && (externalWebsiteUrl === null || typeof externalWebsiteUrl === 'string')) {
      updateData.externalWebsiteUrl = externalWebsiteUrl;
    }
    if (typeof heroTitle === 'string') updateData.heroTitle = heroTitle;
    if (typeof heroSubtitle === 'string') updateData.heroSubtitle = heroSubtitle;
    if (typeof feature1Title === 'string') updateData.feature1Title = feature1Title;
    if (typeof feature1Desc === 'string') updateData.feature1Desc = feature1Desc;
    if (typeof feature2Title === 'string') updateData.feature2Title = feature2Title;
    if (typeof feature2Desc === 'string') updateData.feature2Desc = feature2Desc;
    if (typeof feature3Title === 'string') updateData.feature3Title = feature3Title;
    if (typeof feature3Desc === 'string') updateData.feature3Desc = feature3Desc;
    if (typeof activeSeason === 'string') updateData.activeSeason = activeSeason;
    if (typeof enableCsvImport === 'boolean') updateData.enableCsvImport = enableCsvImport;
    if (typeof enableWelcomeEmails === 'boolean') updateData.enableWelcomeEmails = enableWelcomeEmails;
    if (typeof enableMemberCourtBooking === 'boolean') updateData.enableMemberCourtBooking = enableMemberCourtBooking;
    if (typeof simpleLandingPage === 'boolean') updateData.simpleLandingPage = simpleLandingPage;
    if (typeof landingPageTheme === 'string') updateData.landingPageTheme = landingPageTheme;
    if (typeof enableQrCheckIn === 'boolean') updateData.enableQrCheckIn = enableQrCheckIn;
    if (typeof requireGpsCheckIn === 'boolean') updateData.requireGpsCheckIn = requireGpsCheckIn;
    if (typeof clubLatitude === 'number' || clubLatitude === null) updateData.clubLatitude = clubLatitude;
    if (typeof clubLongitude === 'number' || clubLongitude === null) updateData.clubLongitude = clubLongitude;
    if (Array.isArray(genderOptions)) updateData.genderOptions = genderOptions;
    if (navigationLinks !== undefined) updateData.navigationLinks = navigationLinks;

    const settings = await prisma.systemSetting.upsert({
      where: { id: 'global' },
      update: updateData,
      create: { 
        id: 'global', 
        cancellationCutoffMinutes: typeof cancellationCutoffMinutes === 'number' ? cancellationCutoffMinutes : 90,
        maxHoursPerDay: typeof maxHoursPerDay === 'number' ? maxHoursPerDay : 2,
        maxDaysInAdvance: typeof maxDaysInAdvance === 'number' ? maxDaysInAdvance : 3,
        courtOpenTime: typeof courtOpenTime === 'number' ? courtOpenTime : 6,
        courtCloseTime: typeof courtCloseTime === 'number' ? courtCloseTime : 23,
        calendarDaysToShow: typeof calendarDaysToShow === 'number' ? calendarDaysToShow : 3,
        calendarSkipDays: typeof calendarSkipDays === 'number' ? calendarSkipDays : 1,
        primaryColor: typeof primaryColor === 'string' ? primaryColor : '#4f46e5',
        secondaryColor: typeof secondaryColor === 'string' ? secondaryColor : '#10b981',
        fontFamily: typeof fontFamily === 'string' ? fontFamily : 'Inter',
        heroImageUrl: heroImageUrl === null || typeof heroImageUrl === 'string' ? heroImageUrl : null,
        promoImageUrl: promoImageUrl === null || typeof promoImageUrl === 'string' ? promoImageUrl : null,
        promoLinkUrl: promoLinkUrl === null || typeof promoLinkUrl === 'string' ? promoLinkUrl : null,
        logoUrl: logoUrl === null || typeof logoUrl === 'string' ? logoUrl : null,
        externalWebsiteUrl: adminCheck.user?.isSuperAdmin && (externalWebsiteUrl === null || typeof externalWebsiteUrl === 'string') ? externalWebsiteUrl : null,
        heroTitle: typeof heroTitle === 'string' ? heroTitle : "Elevate Your Game at",
        heroSubtitle: typeof heroSubtitle === 'string' ? heroSubtitle : "Experience premier tennis facilities, professional coaching, and a vibrant community of players of all levels.",
        feature1Title: typeof feature1Title === 'string' ? feature1Title : "Pristine Courts",
        feature1Desc: typeof feature1Desc === 'string' ? feature1Desc : "Play on our perfectly maintained surfaces. Easy online booking ensures your court is ready when you are.",
        feature2Title: typeof feature2Title === 'string' ? feature2Title : "Expert Coaching",
        feature2Desc: typeof feature2Desc === 'string' ? feature2Desc : "Elevate your skills with our certified professionals offering group clinics and private lessons.",
        feature3Title: typeof feature3Title === 'string' ? feature3Title : "Vibrant Community",
        feature3Desc: typeof feature3Desc === 'string' ? feature3Desc : "Join tournaments, ladders, and social events. Find playing partners easily through our member portal.",
        activeSeason: typeof activeSeason === 'string' ? activeSeason : '2026',
        enableCsvImport: typeof enableCsvImport === 'boolean' ? enableCsvImport : true,
        enableWelcomeEmails: typeof enableWelcomeEmails === 'boolean' ? enableWelcomeEmails : true,
        enableMemberCourtBooking: typeof enableMemberCourtBooking === 'boolean' ? enableMemberCourtBooking : true,
        simpleLandingPage: typeof simpleLandingPage === 'boolean' ? simpleLandingPage : false,
        landingPageTheme: typeof landingPageTheme === 'string' ? landingPageTheme : 'classic',
        enableQrCheckIn: typeof enableQrCheckIn === 'boolean' ? enableQrCheckIn : false,
        requireGpsCheckIn: typeof requireGpsCheckIn === 'boolean' ? requireGpsCheckIn : false,
        clubLatitude: typeof clubLatitude === 'number' ? clubLatitude : null,
        clubLongitude: typeof clubLongitude === 'number' ? clubLongitude : null,
        genderOptions: Array.isArray(genderOptions) ? genderOptions : ['Male', 'Female', 'Prefer not to say'],
        navigationLinks: navigationLinks !== undefined ? navigationLinks : null
      }
    });

    return NextResponse.json({ success: true, settings }, { status: 200 });
  } catch (error) {
    console.error('Update settings error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
