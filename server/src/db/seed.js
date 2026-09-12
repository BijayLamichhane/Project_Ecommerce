import { connectDatabase, disconnectDatabase } from "../config/database.js";
import { User, Category, Product, Booking, Review, Notification } from "../models/index.js";
import { logger } from "../utils/logger.js";
import bcrypt from "bcryptjs";
import { subDays } from "date-fns";
import { v4 as uuidv4 } from "uuid";

async function seed() {
  logger.info("🌱 Seeding RentHub database with realistic marketplace data...");
  await connectDatabase();

  await Notification.deleteMany({});
  await Review.deleteMany({});
  await Booking.deleteMany({});
  await Product.deleteMany({});
  await Category.deleteMany({});
  await User.deleteMany({});

  const hashedPassword = await bcrypt.hash("Password123!", 10);

  const adminId = uuidv4();
  await User.create({
    _id: adminId,
    email: "admin@renthub.app",
    name: "Alex Shrestha",
    password: hashedPassword,
    role: "admin",
    status: "active",
    emailVerified: true,
    avatarUrl:
      "https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=200",
    phone: "+977-9801234567",
  });

  const seller1Id = uuidv4();
  const seller2Id = uuidv4();
  const seller3Id = uuidv4();
  const seller4Id = uuidv4();
  const seller5Id = uuidv4();
  const customer1Id = uuidv4();
  const customer2Id = uuidv4();
  const customer3Id = uuidv4();

  const sellersData = [
    {
      id: seller1Id,
      name: "Apex Cine & Lens Rentals",
      email: "apex.rentals@renthub.app",
      avatar:
        "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=200",
      bizName: "Apex Cine Rentals Pvt. Ltd.",
      desc: "Top-tier cinema gear, mirrorless cameras, and professional prime lenses.",
      city: "Kathmandu",
    },
    {
      id: seller2Id,
      name: "Himalaya Camp & Outdoors",
      email: "himalaya.outdoors@renthub.app",
      avatar:
        "https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=200",
      bizName: "Himalayan Adventure Gear",
      desc: "Four-season tents, sleeping bags, trekking poles, and expedition backpacks.",
      city: "Pokhara",
    },
    {
      id: seller3Id,
      name: "ProAudio Sound Lab",
      email: "proaudio@renthub.app",
      avatar:
        "https://images.unsplash.com/photo-1492562080023-ab3db95bfbce?w=200",
      bizName: "ProAudio Event Solutions",
      desc: "Live sound PA systems, studio microphones, synthesizer keyboards, and DJ gear.",
      city: "Lalitpur",
    },
    {
      id: seller4Id,
      name: "PixelTech Gaming & VR Hub",
      email: "pixeltech@renthub.app",
      avatar:
        "https://images.unsplash.com/photo-1519085360753-af0119f7cbe7?w=200",
      bizName: "PixelTech Solutions",
      desc: "PS5 consoles, RTX 4090 gaming laptops, Apple Silicon MacBooks, and VR headsets.",
      city: "Kathmandu",
    },
    {
      id: seller5Id,
      name: "SkyHigh Drones & Aerials",
      email: "skyhigh@renthub.app",
      avatar:
        "https://images.unsplash.com/photo-1506794778202-cad84cf45f1d?w=200",
      bizName: "SkyHigh Aerial Works",
      desc: "DJI cinema drones, gimbal stabilizers, action cams, and FPV racing quadcopters.",
      city: "Bhaktapur",
    },
  ];

  for (const s of sellersData) {
    await User.create({
      _id: s.id,
      email: s.email,
      name: s.name,
      password: hashedPassword,
      role: "seller",
      status: "active",
      emailVerified: true,
      avatarUrl: s.avatar,
      phone: "+977-9841000000",
      sellerProfile: {
        businessName: s.bizName,
        businessDescription: s.desc,
        businessAddress: `${s.city} Hub`,
        businessCity: s.city,
        panNumber: "109876543",
        bankAccountName: s.bizName,
        bankAccountNumber: "01234567890123",
        bankName: "Nabil Bank Ltd.",
        isVerified: true,
        verifiedAt: new Date(),
        status: "approved",
        averageRating: "4.9",
        totalRatings: 42,
        totalEarnings: "128500",
      },
    });
  }

  const customersData = [
    { id: customer1Id, name: "Prashant Sharma", email: "prashant@example.com" },
    { id: customer2Id, name: "Sneha Thapa", email: "sneha@example.com" },
    { id: customer3Id, name: "Bikash Gurung", email: "bikash@example.com" },
  ];

  for (const c of customersData) {
    await User.create({
      _id: c.id,
      email: c.email,
      name: c.name,
      password: hashedPassword,
      role: "customer",
      status: "active",
      emailVerified: true,
      avatarUrl:
        "https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=200",
      phone: "+977-9812345678",
    });
  }

  const categoryDefinitions = [
    {
      name: "Cameras & Lenses",
      slug: "cameras-lenses",
      icon: "Camera",
      desc: "Mirrorless, Cinema & DSLR cameras, lenses & lighting",
    },
    {
      name: "Laptops & Computers",
      slug: "laptops-computers",
      icon: "Laptop",
      desc: "MacBooks, Windows gaming laptops & workstations",
    },
    {
      name: "Camping & Outdoors",
      slug: "camping-outdoors",
      icon: "Tent",
      desc: "Tents, sleeping bags, hiking packs & outdoor stoves",
    },
    {
      name: "Musical Instruments",
      slug: "musical-instruments",
      icon: "Music",
      desc: "Guitars, Keyboards, Drums & Studio gear",
    },
    {
      name: "Power Tools",
      slug: "power-tools",
      icon: "Wrench",
      desc: "Drills, saws, pressure washers & construction tools",
    },
    {
      name: "Party & Events",
      slug: "party-events",
      icon: "Sparkles",
      desc: "Speakers, lighting fixtures, smoke machines & projectors",
    },
    {
      name: "Gaming & VR",
      slug: "gaming-vr",
      icon: "Gamepad2",
      desc: "PlayStation 5, Meta Quest 3, Xbox Series X & Handhelds",
    },
    {
      name: "Drones & Aerial",
      slug: "drones-aerial",
      icon: "Navigation",
      desc: "DJI Mavic, Mini, Inspire & FPV goggles",
    },
    {
      name: "Projectors & AV",
      slug: "projectors-av",
      icon: "Projector",
      desc: "4K Home theater projectors, screens & PA monitors",
    },
    {
      name: "Sports & Fitness",
      slug: "sports-fitness",
      icon: "Bike",
      desc: "Mountain bikes, kayaks, paddleboards & fitness equipment",
    },
  ];

  const categoryMap = new Map();
  for (let i = 0; i < categoryDefinitions.length; i++) {
    const c = categoryDefinitions[i];
    const catId = uuidv4();
    await Category.create({
      _id: catId,
      name: c.name,
      slug: c.slug,
      iconName: c.icon,
      description: c.desc,
      sortOrder: i + 1,
      isActive: true,
    });
    categoryMap.set(c.slug, catId);
  }

  const productsToSeed = [
    {
      sellerId: seller1Id,
      catSlug: "cameras-lenses",
      name: "Sony Alpha 7 IV Full-Frame Mirrorless Camera",
      slug: "sony-alpha-7-iv-camera",
      desc: "33MP full-frame Exmor R sensor with BIONZ XR processor. 4K 60p 10-bit 4:2:2 video, dual SD card slots, outstanding real-time autofocus.",
      brand: "Sony",
      model: "ILCE-7M4",
      city: "Kathmandu",
      rates: { daily: 2500, weekly: 14000, monthly: 48000, deposit: 25000 },
      image:
        "https://images.unsplash.com/photo-1516035069371-29a1b244cc32?w=800",
      rating: "4.9",
      rentals: 28,
    },
    {
      sellerId: seller1Id,
      catSlug: "cameras-lenses",
      name: "Sony FE 24-70mm f/2.8 GM II Lens",
      slug: "sony-fe-24-70mm-gm2-lens",
      desc: "The pinnacle standard zoom lens for Sony E-mount. Exceptionally sharp corner to corner with fast dual XD linear motor AF.",
      brand: "Sony",
      model: "SEL2470GM2",
      city: "Kathmandu",
      rates: { daily: 1500, weekly: 8500, monthly: 28000, deposit: 18000 },
      image:
        "https://images.unsplash.com/photo-1617005082133-548c4dd27f35?w=800",
      rating: "5.0",
      rentals: 19,
    },
    {
      sellerId: seller1Id,
      catSlug: "cameras-lenses",
      name: "Canon EOS R5 8K Mirrorless Camera",
      slug: "canon-eos-r5-8k-camera",
      desc: "45MP full-frame sensor capable of 8K RAW video recording, Dual Pixel CMOS AF II, up to 8 stops of in-body image stabilization.",
      brand: "Canon",
      model: "EOS R5",
      city: "Kathmandu",
      rates: { daily: 3200, weekly: 18500, monthly: 62000, deposit: 35000 },
      image:
        "https://images.unsplash.com/photo-1502982720700-bfff97f2ecac?w=800",
      rating: "4.8",
      rentals: 15,
    },
    {
      sellerId: seller1Id,
      catSlug: "cameras-lenses",
      name: "Fujifilm X-T5 Mirrorless Digital Camera",
      slug: "fujifilm-xt5-camera",
      desc: "40.2MP X-Trans CMOS 5 HR sensor, classic dial controls, 19 film simulation modes, and 6.2K 30p internal movie recording.",
      brand: "Fujifilm",
      model: "X-T5",
      city: "Kathmandu",
      rates: { daily: 1800, weekly: 10000, monthly: 35000, deposit: 18000 },
      image:
        "https://images.unsplash.com/photo-1510127034890-ba27508e9f1c?w=800",
      rating: "4.9",
      rentals: 12,
    },
    {
      sellerId: seller4Id,
      catSlug: "laptops-computers",
      name: 'Apple MacBook Pro 16" (M3 Max, 64GB RAM, 1TB SSD)',
      slug: "macbook-pro-16-m3-max",
      desc: "Extreme performance for 8K video editing, 3D rendering, and software compiling. Stunning Liquid Retina XDR display with 22hr battery.",
      brand: "Apple",
      model: "MacBook Pro 16",
      city: "Kathmandu",
      rates: { daily: 3500, weekly: 20000, monthly: 68000, deposit: 40000 },
      image:
        "https://images.unsplash.com/photo-1517336714731-489689fd1ca8?w=800",
      rating: "5.0",
      rentals: 34,
    },
    {
      sellerId: seller4Id,
      catSlug: "laptops-computers",
      name: "ASUS ROG Zephyrus G16 (RTX 4090, i9-14900HX)",
      slug: "asus-rog-zephyrus-g16-gaming-laptop",
      desc: "Ultra-slim powerhouse gaming laptop with OLED 240Hz display, NVIDIA GeForce RTX 4090 16GB, and vapor chamber cooling.",
      brand: "ASUS",
      model: "GU605MY",
      city: "Kathmandu",
      rates: { daily: 3000, weekly: 17500, monthly: 58000, deposit: 35000 },
      image:
        "https://images.unsplash.com/photo-1603302576837-37561b2e2302?w=800",
      rating: "4.8",
      rentals: 22,
    },
    {
      sellerId: seller4Id,
      catSlug: "laptops-computers",
      name: "Dell XPS 15 9530 (OLED Touch, i7, 32GB RAM)",
      slug: "dell-xps-15-oled-laptop",
      desc: "Elegant CNC aluminum laptop with 3.5K OLED touchscreen, 13th Gen Intel Core i7, and RTX 4060 graphics.",
      brand: "Dell",
      model: "XPS 15 9530",
      city: "Kathmandu",
      rates: { daily: 2200, weekly: 12500, monthly: 42000, deposit: 25000 },
      image:
        "https://images.unsplash.com/photo-1593642632823-8f785ba67e45?w=800",
      rating: "4.7",
      rentals: 16,
    },
    {
      sellerId: seller2Id,
      catSlug: "camping-outdoors",
      name: "The North Face Mountain 25 4-Season Expedition Tent",
      slug: "north-face-mountain-25-tent",
      desc: "Geodesic expedition tent engineered to withstand high Himalayan winds and heavy snowstorms. Dual doors and spacious vestibules.",
      brand: "The North Face",
      model: "Mountain 25",
      city: "Pokhara",
      rates: { daily: 1200, weekly: 6500, monthly: 20000, deposit: 10000 },
      image:
        "https://images.unsplash.com/photo-1504280390367-361c6d9f38f4?w=800",
      rating: "4.9",
      rentals: 45,
    },
    {
      sellerId: seller2Id,
      catSlug: "camping-outdoors",
      name: "Marmot CWM -40°C Goose Down Sleeping Bag",
      slug: "marmot-cwm-down-sleeping-bag",
      desc: "800 fill power goose down mummy bag with Pertex Shield waterproof shell for extreme alpine ascents and Annapurna/Everest base camps.",
      brand: "Marmot",
      model: "CWM -40",
      city: "Pokhara",
      rates: { daily: 900, weekly: 5000, monthly: 15000, deposit: 8000 },
      image:
        "https://images.unsplash.com/photo-1510312305653-8ed496efae75?w=800",
      rating: "5.0",
      rentals: 38,
    },
    {
      sellerId: seller2Id,
      catSlug: "camping-outdoors",
      name: "Osprey Aether Plus 85L Backpacking Pack",
      slug: "osprey-aether-plus-85l-backpack",
      desc: "Custom Fit-on-the-Fly hipbelt and shoulder straps. Heavy load support with integrated raincover and convertible DayLid daypack.",
      brand: "Osprey",
      model: "Aether Plus 85",
      city: "Pokhara",
      rates: { daily: 600, weekly: 3200, monthly: 10000, deposit: 5000 },
      image:
        "https://images.unsplash.com/photo-1622260614153-03223fb72052?w=800",
      rating: "4.8",
      rentals: 29,
    },
    {
      sellerId: seller3Id,
      catSlug: "musical-instruments",
      name: "Fender Player Stratocaster Electric Guitar (Buttercream)",
      slug: "fender-player-stratocaster-guitar",
      desc: "Authentic Fender bell-like chime and crisp articulation. Three Player Series single-coil pickups with synchronized tremolo bridge.",
      brand: "Fender",
      model: "Player Strat",
      city: "Lalitpur",
      rates: { daily: 1000, weekly: 5500, monthly: 18000, deposit: 12000 },
      image:
        "https://images.unsplash.com/photo-1516924962500-2b4b3b99ea02?w=800",
      rating: "4.9",
      rentals: 21,
    },
    {
      sellerId: seller3Id,
      catSlug: "musical-instruments",
      name: "Nord Stage 4 88-Key Stage Keyboard Synthesizer",
      slug: "nord-stage-4-88-keyboard",
      desc: "Flagship live stage piano featuring triple sensor keybed, dedicated organ, piano, and synth sections with individual OLED displays.",
      brand: "Nord",
      model: "Stage 4 88",
      city: "Lalitpur",
      rates: { daily: 4000, weekly: 22000, monthly: 75000, deposit: 45000 },
      image:
        "https://images.unsplash.com/photo-1520523839898-507121287c71?w=800",
      rating: "5.0",
      rentals: 14,
    },
    {
      sellerId: seller3Id,
      catSlug: "musical-instruments",
      name: "Roland TD-17KVX V-Drums Electronic Drum Kit",
      slug: "roland-td17kvx-electronic-drums",
      desc: "Natural, expressive acoustic drumming feel with mesh-head pads, VH-10 floating hi-hat, and Bluetooth audio playback for live gigs.",
      brand: "Roland",
      model: "TD-17KVX",
      city: "Lalitpur",
      rates: { daily: 2500, weekly: 14000, monthly: 45000, deposit: 25000 },
      image:
        "https://images.unsplash.com/photo-1519892300165-cb5542fb47c7?w=800",
      rating: "4.7",
      rentals: 11,
    },
    {
      sellerId: seller5Id,
      catSlug: "drones-aerial",
      name: "DJI Mavic 3 Pro Cine Drone (Triple Camera with ProRes)",
      slug: "dji-mavic-3-pro-cine-drone",
      desc: "Flagship aerial platform with Hasselblad 4/3 CMOS main camera + dual tele lenses. Apple ProRes 422 HQ recording with 43min flight time.",
      brand: "DJI",
      model: "Mavic 3 Pro Cine",
      city: "Bhaktapur",
      rates: { daily: 4500, weekly: 25000, monthly: 85000, deposit: 40000 },
      image:
        "https://images.unsplash.com/photo-1473968512647-3e447244af8f?w=800",
      rating: "5.0",
      rentals: 31,
    },
    {
      sellerId: seller5Id,
      catSlug: "drones-aerial",
      name: "DJI Avata 2 FPV Drone Combo with Goggles 3",
      slug: "dji-avata-2-fpv-combo",
      desc: "High-octane immersive FPV flying with 4K/60fps HDR super-wide 155° FOV, motion controller, and built-in propeller guard for tight spaces.",
      brand: "DJI",
      model: "Avata 2",
      city: "Bhaktapur",
      rates: { daily: 2800, weekly: 15500, monthly: 50000, deposit: 22000 },
      image:
        "https://images.unsplash.com/photo-1527977966376-1c8408f9f108?w=800",
      rating: "4.8",
      rentals: 18,
    },
    {
      sellerId: seller4Id,
      catSlug: "gaming-vr",
      name: "Sony PlayStation 5 Slim Console with 2 DualSense Controllers",
      slug: "ps5-slim-console-bundle",
      desc: "Next-gen 4K 120Hz console gaming with ultra-fast 1TB NVMe SSD, Ray Tracing, and 3 pre-loaded games (Spider-Man 2, FC 24, Gran Turismo 7).",
      brand: "Sony",
      model: "PS5 Slim Disc",
      city: "Kathmandu",
      rates: { daily: 1200, weekly: 6500, monthly: 20000, deposit: 15000 },
      image:
        "https://images.unsplash.com/photo-1606813907291-d86efa9b94db?w=800",
      rating: "4.9",
      rentals: 58,
    },
    {
      sellerId: seller4Id,
      catSlug: "gaming-vr",
      name: "Meta Quest 3 VR Headset (512GB) with Elite Strap",
      slug: "meta-quest-3-512gb-vr",
      desc: "Breakthrough mixed reality headset with dual color pass-through cameras, 4K+ Infinite Display, and spatial 3D audio.",
      brand: "Meta",
      model: "Quest 3 512GB",
      city: "Kathmandu",
      rates: { daily: 1600, weekly: 9000, monthly: 28000, deposit: 18000 },
      image:
        "https://images.unsplash.com/photo-1622979135225-d2ba269bc1df?w=800",
      rating: "4.8",
      rentals: 27,
    },
    {
      sellerId: seller3Id,
      catSlug: "projectors-av",
      name: "BenQ TK860i 4K HDR Home Cinema Projector (3300 Lumens)",
      slug: "benq-tk860i-4k-projector",
      desc: "True 4K UHD resolution projector with HDR-PRO technology, Android TV streaming, and cinematic color accuracy for movie nights.",
      brand: "BenQ",
      model: "TK860i",
      city: "Lalitpur",
      rates: { daily: 2000, weekly: 11000, monthly: 36000, deposit: 20000 },
      image:
        "https://images.unsplash.com/photo-1517604931442-7e0c8ed2963c?w=800",
      rating: "4.9",
      rentals: 19,
    },
    {
      sellerId: seller5Id,
      catSlug: "power-tools",
      name: "DeWalt 20V MAX XR 6-Tool Brushless Combo Kit",
      slug: "dewalt-20v-max-xr-tool-kit",
      desc: "Includes Hammer Drill, Impact Driver, Circular Saw, Reciprocating Saw, Oscillating Multi-Tool, LED light, and dual 5.0Ah batteries.",
      brand: "DeWalt",
      model: "DCK694P2",
      city: "Bhaktapur",
      rates: { daily: 1500, weekly: 8000, monthly: 25000, deposit: 15000 },
      image:
        "https://images.unsplash.com/photo-1581147036324-c17ac41dfa6c?w=800",
      rating: "4.9",
      rentals: 14,
    },
    {
      sellerId: seller2Id,
      catSlug: "sports-fitness",
      name: "Trek Fuel EX 8 Gen 6 Full Suspension Mountain Bike (Size M/L)",
      slug: "trek-fuel-ex-8-mountain-bike",
      desc: "All-mountain trail bike with FOX Rhythm 36 150mm fork, FOX Performance EVOL shock, Shimano XT 12-speed drivetrain, and 4-piston disc brakes.",
      brand: "Trek",
      model: "Fuel EX 8",
      city: "Pokhara",
      rates: { daily: 2500, weekly: 14000, monthly: 45000, deposit: 30000 },
      image:
        "https://images.unsplash.com/photo-1485965120184-e220f721d03e?w=800",
      rating: "5.0",
      rentals: 36,
    },
  ];

  const seededProductIds = [];
  for (const p of productsToSeed) {
    const categoryId = categoryMap.get(p.catSlug);
    const prodId = uuidv4();
    seededProductIds.push(prodId);
    await Product.create({
      _id: prodId,
      sellerId: p.sellerId,
      categoryId,
      name: p.name,
      slug: p.slug,
      description: p.desc,
      shortDescription: p.desc.substring(0, 120) + "...",
      brand: p.brand,
      model: p.model,
      condition: "like_new",
      status: "active",
      city: p.city,
      totalQuantity: 3,
      totalRentals: p.rentals,
      totalRatings: Math.floor(p.rentals * 0.8),
      averageRating: p.rating,
      isFeatured: true,
      viewCount: p.rentals * 15 + 40,
      images: [
        {
          url: p.image,
          isPrimary: true,
          sortOrder: 0,
          altText: p.name,
        },
      ],
      pricing: {
        dailyRate: String(p.rates.daily),
        weeklyRate: String(p.rates.weekly),
        monthlyRate: String(p.rates.monthly),
        securityDeposit: String(p.rates.deposit),
        serviceFeePercent: "10",
        deliveryFee: "300",
        minimumRentalDays: 1,
        maximumRentalDays: 90,
      },
      rules: {
        rules: [
          "Valid government-issued ID required on handover",
          "Handle with care and return in original protective case",
          "No unauthorized repairs or firmware modifications",
        ],
        cancellationPolicy: "flexible",
        instantBook: true,
      },
    });
  }

  const sampleBooking1Id = uuidv4();
  const cameraProdId = seededProductIds[0];
  const startPast = subDays(new Date(), 10);
  const endPast = subDays(new Date(), 6);

  await Booking.create({
    _id: sampleBooking1Id,
    customerId: customer1Id,
    sellerId: seller1Id,
    status: "completed",
    totalRentalPrice: "10000",
    totalDeposit: "25000",
    serviceFee: "1000",
    deliveryFee: "300",
    totalAmount: "11300",
    confirmedAt: subDays(new Date(), 11),
    activatedAt: startPast,
    returnedAt: endPast,
    completedAt: endPast,
    bookingItems: [
      {
        productId: cameraProdId,
        quantity: 1,
        startDate: startPast,
        endDate: endPast,
        dailyRate: "2500",
        baseRentalPrice: "10000",
        securityDeposit: "25000",
        durationDays: 4,
      },
    ],
    timeline: [
      {
        status: "pending",
        timestamp: subDays(new Date(), 12),
        actorId: customer1Id,
        note: "Booking request submitted",
      },
      {
        status: "confirmed",
        timestamp: subDays(new Date(), 11),
        actorId: seller1Id,
        note: "Booking confirmed by seller",
      },
      {
        status: "active",
        timestamp: startPast,
        actorId: seller1Id,
        note: "Product handed over to customer",
      },
      {
        status: "returned",
        timestamp: endPast,
        actorId: seller1Id,
        note: "Product returned in good condition",
      },
      {
        status: "completed",
        timestamp: endPast,
        actorId: seller1Id,
        note: "Rental completed successfully",
      },
    ],
  });

  await Review.create({
    _id: uuidv4(),
    productId: cameraProdId,
    bookingId: sampleBooking1Id,
    reviewerId: customer1Id,
    sellerId: seller1Id,
    rating: 5,
    title: "Flawless camera condition and smooth pickup!",
    comment:
      "Rented this Sony A7 IV for a 3-day documentary shoot in Pokhara. The camera was in immaculate condition with all batteries fully charged. Apex Cine rentals made pickup super convenient. Will definitely rent again!",
    isPublished: true,
  });

  await Notification.insertMany([
    {
      _id: uuidv4(),
      userId: customer1Id,
      type: "booking_confirmed",
      title: "Booking Confirmed! 🎉",
      message:
        "Your rental for Sony Alpha 7 IV was confirmed by Apex Cine Rentals.",
      isRead: true,
    },
    {
      _id: uuidv4(),
      userId: seller1Id,
      type: "booking_request",
      title: "New Booking Request",
      message:
        "Prashant Sharma booked Sony Alpha 7 IV Full-Frame Camera.",
      isRead: false,
    },
  ]);

  logger.info(
    "✅ Database seeded successfully with 10 categories, 20+ products, 5 sellers, bookings & reviews!"
  );
  await disconnectDatabase();
}

seed().catch((err) => {
  logger.error({ err }, "❌ Failed to seed database");
  process.exit(1);
});
