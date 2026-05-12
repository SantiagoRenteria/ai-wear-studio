using AiWearStudio.Catalog.Domain.Entities;

namespace AiWearStudio.Catalog.Infrastructure.Persistence;

public static class CatalogSeedData
{
    // â”€â”€ Techniques â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
    public static readonly Guid TechSublimacion = new("a0000001-0000-0000-0000-000000000001");
    public static readonly Guid TechSerigrafia  = new("a0000001-0000-0000-0000-000000000002");
    public static readonly Guid TechDtf         = new("a0000001-0000-0000-0000-000000000003");
    public static readonly Guid TechBordado      = new("a0000001-0000-0000-0000-000000000004");
    public static readonly Guid TechVinilo       = new("a0000001-0000-0000-0000-000000000005");

    // â”€â”€ Garments â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
    public static readonly Guid GarmTshirt      = new("b0000001-0000-0000-0000-000000000001");
    public static readonly Guid GarmLongSleeve  = new("b0000001-0000-0000-0000-000000000002");
    public static readonly Guid GarmPolo        = new("b0000001-0000-0000-0000-000000000003");
    public static readonly Guid GarmCrewneck    = new("b0000001-0000-0000-0000-000000000004");
    public static readonly Guid GarmHoodie      = new("b0000001-0000-0000-0000-000000000005");
    public static readonly Guid GarmJacket      = new("b0000001-0000-0000-0000-000000000006");
    public static readonly Guid GarmSweatpants  = new("b0000001-0000-0000-0000-000000000007");
    public static readonly Guid GarmShorts      = new("b0000001-0000-0000-0000-000000000008");
    public static readonly Guid GarmCap         = new("b0000001-0000-0000-0000-000000000009");
    public static readonly Guid GarmToteBag     = new("b0000001-0000-0000-0000-000000000010");

    // â”€â”€ Views â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
    // Camiseta MC (2 views)
    public static readonly Guid ViewTshirtFront      = new("c0000001-0000-0000-0000-000000000001");
    public static readonly Guid ViewTshirtBack       = new("c0000001-0000-0000-0000-000000000002");
    // Camiseta ML (3 views)
    public static readonly Guid ViewLsFront          = new("c0000001-0000-0000-0000-000000000003");
    public static readonly Guid ViewLsBack           = new("c0000001-0000-0000-0000-000000000004");
    public static readonly Guid ViewLsSleeve         = new("c0000001-0000-0000-0000-000000000005");
    // Polo (2 views)
    public static readonly Guid ViewPoloFront        = new("c0000001-0000-0000-0000-000000000006");
    public static readonly Guid ViewPoloBack         = new("c0000001-0000-0000-0000-000000000007");
    // Buzo Crew (2 views)
    public static readonly Guid ViewCrewneckFront    = new("c0000001-0000-0000-0000-000000000008");
    public static readonly Guid ViewCrewneckBack     = new("c0000001-0000-0000-0000-000000000009");
    // Hoodie (3 views)
    public static readonly Guid ViewHoodieFront      = new("c0000001-0000-0000-0000-000000000010");
    public static readonly Guid ViewHoodieBack       = new("c0000001-0000-0000-0000-000000000011");
    public static readonly Guid ViewHoodieHood       = new("c0000001-0000-0000-0000-000000000012");
    // Chaqueta (3 views)
    public static readonly Guid ViewJacketFront      = new("c0000001-0000-0000-0000-000000000013");
    public static readonly Guid ViewJacketBack       = new("c0000001-0000-0000-0000-000000000014");
    public static readonly Guid ViewJacketSleeve     = new("c0000001-0000-0000-0000-000000000015");
    // PantalÃ³n (2 views)
    public static readonly Guid ViewSweatpantsFront  = new("c0000001-0000-0000-0000-000000000016");
    public static readonly Guid ViewSweatpantsBack   = new("c0000001-0000-0000-0000-000000000017");
    // Shorts (2 views)
    public static readonly Guid ViewShortsFront      = new("c0000001-0000-0000-0000-000000000018");
    public static readonly Guid ViewShortsBack       = new("c0000001-0000-0000-0000-000000000019");
    // Gorra (2 views)
    public static readonly Guid ViewCapFront         = new("c0000001-0000-0000-0000-000000000020");
    public static readonly Guid ViewCapSide          = new("c0000001-0000-0000-0000-000000000021");
    // Tote Bag (1 view)
    public static readonly Guid ViewToteFront        = new("c0000001-0000-0000-0000-000000000022");

    // â”€â”€ Print Zones (23 total) â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
    // Camiseta MC (2 zones)
    public static readonly Guid ZoneTshirtChest      = new("d0000001-0000-0000-0000-000000000001");
    public static readonly Guid ZoneTshirtBack       = new("d0000001-0000-0000-0000-000000000002");
    // Camiseta ML (3 zones)
    public static readonly Guid ZoneLsChest          = new("d0000001-0000-0000-0000-000000000003");
    public static readonly Guid ZoneLsBack           = new("d0000001-0000-0000-0000-000000000004");
    public static readonly Guid ZoneLsSleeve         = new("d0000001-0000-0000-0000-000000000005");
    // Polo (3 zones: 2 in front, 1 in back)
    public static readonly Guid ZonePoloFrontLeft    = new("d0000001-0000-0000-0000-000000000006");
    public static readonly Guid ZonePoloFrontRight   = new("d0000001-0000-0000-0000-000000000007");
    public static readonly Guid ZonePoloBack         = new("d0000001-0000-0000-0000-000000000008");
    // Buzo Crew (2 zones)
    public static readonly Guid ZoneCrewneckChest    = new("d0000001-0000-0000-0000-000000000009");
    public static readonly Guid ZoneCrewneckBack     = new("d0000001-0000-0000-0000-000000000010");
    // Hoodie (3 zones)
    public static readonly Guid ZoneHoodieChest      = new("d0000001-0000-0000-0000-000000000011");
    public static readonly Guid ZoneHoodieBack       = new("d0000001-0000-0000-0000-000000000012");
    public static readonly Guid ZoneHoodieHood       = new("d0000001-0000-0000-0000-000000000013");
    // Chaqueta (3 zones)
    public static readonly Guid ZoneJacketFrontLeft  = new("d0000001-0000-0000-0000-000000000014");
    public static readonly Guid ZoneJacketBack       = new("d0000001-0000-0000-0000-000000000015");
    public static readonly Guid ZoneJacketSleeve     = new("d0000001-0000-0000-0000-000000000016");
    // PantalÃ³n (2 zones)
    public static readonly Guid ZoneSweatpantsThigh  = new("d0000001-0000-0000-0000-000000000017");
    public static readonly Guid ZoneSweatpantsBack   = new("d0000001-0000-0000-0000-000000000018");
    // Shorts (2 zones)
    public static readonly Guid ZoneShortsThigh      = new("d0000001-0000-0000-0000-000000000019");
    public static readonly Guid ZoneShortsBack       = new("d0000001-0000-0000-0000-000000000020");
    // Gorra (2 zones)
    public static readonly Guid ZoneCapFront         = new("d0000001-0000-0000-0000-000000000021");
    public static readonly Guid ZoneCapSide          = new("d0000001-0000-0000-0000-000000000022");
    // Tote Bag (1 zone)
    public static readonly Guid ZoneToteFront        = new("d0000001-0000-0000-0000-000000000023");

    // â”€â”€ Seed arrays â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

    public static PrintTechnique[] PrintTechniques =>
    [
        PrintTechnique.Create(TechSublimacion, "SublimaciÃ³n Total",    "ImpresiÃ³n por calor con tinta de sublimaciÃ³n. Ideal para prendas de poliÃ©ster con cobertura total."),
        PrintTechnique.Create(TechSerigrafia,  "SerigrafÃ­a",           "ImpresiÃ³n con malla y tinta plastisol. MÃ¡xima durabilidad para pedidos de volumen."),
        PrintTechnique.Create(TechDtf,         "Transfer Digital (DTF)","Film transferible por calor. Permite colores ilimitados y detalles finos."),
        PrintTechnique.Create(TechBordado,     "Bordado",              "Hilo bordado sobre la prenda. Acabado premium de alta durabilidad."),
        PrintTechnique.Create(TechVinilo,      "Vinilo Termoadhesivo", "Vinilo cortado y aplicado con calor. Ideal para textos y formas simples."),
    ];

    public static Garment[] Garments =>
    [
        Garment.Create(GarmTshirt,     "Camiseta Manga Corta",    "camiseta",   1),
        Garment.Create(GarmLongSleeve, "Camiseta Manga Larga",    "camiseta",   2),
        Garment.Create(GarmPolo,       "Polo / PiquÃ©",            "polo",       3),
        Garment.Create(GarmCrewneck,   "Buzo Crew Neck",          "buzo",       4),
        Garment.Create(GarmHoodie,     "Buzo con Capucha",        "buzo",       5),
        Garment.Create(GarmJacket,     "Chaqueta Deportiva",      "chaqueta",   6),
        Garment.Create(GarmSweatpants, "PantalÃ³n de Buzo",        "pantalon",   7),
        Garment.Create(GarmShorts,     "Short Deportivo",         "short",      8),
        Garment.Create(GarmCap,        "Gorra 5 Paneles",         "accesorio",  9),
        Garment.Create(GarmToteBag,    "Tote Bag",                "accesorio", 10),
    ];

    public static GarmentColorVariant[] ColorVariants =>
    [
        // Camiseta MC â€” 5 colores
        GarmentColorVariant.Create(new("e0000001-0001-0001-0001-000000000001"), GarmTshirt, "Blanco",     "#FFFFFF", 1),
        GarmentColorVariant.Create(new("e0000001-0001-0001-0001-000000000002"), GarmTshirt, "Negro",      "#000000", 2),
        GarmentColorVariant.Create(new("e0000001-0001-0001-0001-000000000003"), GarmTshirt, "Gris",       "#808080", 3),
        GarmentColorVariant.Create(new("e0000001-0001-0001-0001-000000000004"), GarmTshirt, "Azul Navy",  "#001F5B", 4),
        GarmentColorVariant.Create(new("e0000001-0001-0001-0001-000000000005"), GarmTshirt, "Rojo",       "#CC0000", 5),
        // Camiseta ML â€” 4 colores
        GarmentColorVariant.Create(new("e0000001-0002-0002-0002-000000000001"), GarmLongSleeve, "Blanco",    "#FFFFFF", 1),
        GarmentColorVariant.Create(new("e0000001-0002-0002-0002-000000000002"), GarmLongSleeve, "Negro",     "#000000", 2),
        GarmentColorVariant.Create(new("e0000001-0002-0002-0002-000000000003"), GarmLongSleeve, "Gris",      "#808080", 3),
        GarmentColorVariant.Create(new("e0000001-0002-0002-0002-000000000004"), GarmLongSleeve, "Azul Navy", "#001F5B", 4),
        // Polo â€” 4 colores
        GarmentColorVariant.Create(new("e0000001-0003-0003-0003-000000000001"), GarmPolo, "Blanco",       "#FFFFFF", 1),
        GarmentColorVariant.Create(new("e0000001-0003-0003-0003-000000000002"), GarmPolo, "Negro",        "#000000", 2),
        GarmentColorVariant.Create(new("e0000001-0003-0003-0003-000000000003"), GarmPolo, "Azul Navy",    "#001F5B", 3),
        GarmentColorVariant.Create(new("e0000001-0003-0003-0003-000000000004"), GarmPolo, "Verde Bosque", "#228B22", 4),
        // Buzo Crew â€” 4 colores
        GarmentColorVariant.Create(new("e0000001-0004-0004-0004-000000000001"), GarmCrewneck, "Gris Claro", "#D3D3D3", 1),
        GarmentColorVariant.Create(new("e0000001-0004-0004-0004-000000000002"), GarmCrewneck, "Negro",      "#000000", 2),
        GarmentColorVariant.Create(new("e0000001-0004-0004-0004-000000000003"), GarmCrewneck, "Azul Navy",  "#001F5B", 3),
        GarmentColorVariant.Create(new("e0000001-0004-0004-0004-000000000004"), GarmCrewneck, "Beige",      "#F5F5DC", 4),
        // Hoodie â€” 4 colores
        GarmentColorVariant.Create(new("e0000001-0005-0005-0005-000000000001"), GarmHoodie, "Gris Claro",    "#D3D3D3", 1),
        GarmentColorVariant.Create(new("e0000001-0005-0005-0005-000000000002"), GarmHoodie, "Negro",         "#000000", 2),
        GarmentColorVariant.Create(new("e0000001-0005-0005-0005-000000000003"), GarmHoodie, "Azul Navy",     "#001F5B", 3),
        GarmentColorVariant.Create(new("e0000001-0005-0005-0005-000000000004"), GarmHoodie, "Verde Militar", "#4B5320", 4),
        // Chaqueta â€” 3 colores
        GarmentColorVariant.Create(new("e0000001-0006-0006-0006-000000000001"), GarmJacket, "Negro",         "#000000", 1),
        GarmentColorVariant.Create(new("e0000001-0006-0006-0006-000000000002"), GarmJacket, "Azul Navy",     "#001F5B", 2),
        GarmentColorVariant.Create(new("e0000001-0006-0006-0006-000000000003"), GarmJacket, "Verde Militar", "#4B5320", 3),
        // PantalÃ³n â€” 3 colores
        GarmentColorVariant.Create(new("e0000001-0007-0007-0007-000000000001"), GarmSweatpants, "Gris",      "#808080", 1),
        GarmentColorVariant.Create(new("e0000001-0007-0007-0007-000000000002"), GarmSweatpants, "Negro",     "#000000", 2),
        GarmentColorVariant.Create(new("e0000001-0007-0007-0007-000000000003"), GarmSweatpants, "Azul Navy", "#001F5B", 3),
        // Shorts â€” 3 colores
        GarmentColorVariant.Create(new("e0000001-0008-0008-0008-000000000001"), GarmShorts, "Negro",     "#000000", 1),
        GarmentColorVariant.Create(new("e0000001-0008-0008-0008-000000000002"), GarmShorts, "Azul Navy", "#001F5B", 2),
        GarmentColorVariant.Create(new("e0000001-0008-0008-0008-000000000003"), GarmShorts, "Rojo",      "#CC0000", 3),
        // Gorra â€” 3 colores
        GarmentColorVariant.Create(new("e0000001-0009-0009-0009-000000000001"), GarmCap, "Negro",     "#000000", 1),
        GarmentColorVariant.Create(new("e0000001-0009-0009-0009-000000000002"), GarmCap, "Azul Navy", "#001F5B", 2),
        GarmentColorVariant.Create(new("e0000001-0009-0009-0009-000000000003"), GarmCap, "Blanco",    "#FFFFFF", 3),
        // Tote Bag â€” 3 colores
        GarmentColorVariant.Create(new("e0000001-0010-0010-0010-000000000001"), GarmToteBag, "Beige", "#F5F5DC", 1),
        GarmentColorVariant.Create(new("e0000001-0010-0010-0010-000000000002"), GarmToteBag, "Negro", "#000000", 2),
        GarmentColorVariant.Create(new("e0000001-0010-0010-0010-000000000003"), GarmToteBag, "Blanco","#FFFFFF", 3),
    ];

    public static GarmentView[] GarmentViews =>
    [
        // Camiseta MC
        GarmentView.Create(ViewTshirtFront,     GarmTshirt,     "front",      1),
        GarmentView.Create(ViewTshirtBack,      GarmTshirt,     "back",       2),
        // Camiseta ML
        GarmentView.Create(ViewLsFront,         GarmLongSleeve, "front",      1),
        GarmentView.Create(ViewLsBack,          GarmLongSleeve, "back",       2),
        GarmentView.Create(ViewLsSleeve,        GarmLongSleeve, "sleeve_left",3),
        // Polo
        GarmentView.Create(ViewPoloFront,       GarmPolo,       "front",      1),
        GarmentView.Create(ViewPoloBack,        GarmPolo,       "back",       2),
        // Buzo Crew
        GarmentView.Create(ViewCrewneckFront,   GarmCrewneck,   "front",      1),
        GarmentView.Create(ViewCrewneckBack,    GarmCrewneck,   "back",       2),
        // Hoodie
        GarmentView.Create(ViewHoodieFront,     GarmHoodie,     "front",      1),
        GarmentView.Create(ViewHoodieBack,      GarmHoodie,     "back",       2),
        GarmentView.Create(ViewHoodieHood,      GarmHoodie,     "hood",       3),
        // Chaqueta
        GarmentView.Create(ViewJacketFront,     GarmJacket,     "front",      1),
        GarmentView.Create(ViewJacketBack,      GarmJacket,     "back",       2),
        GarmentView.Create(ViewJacketSleeve,    GarmJacket,     "sleeve_left",3),
        // PantalÃ³n
        GarmentView.Create(ViewSweatpantsFront, GarmSweatpants, "front",      1),
        GarmentView.Create(ViewSweatpantsBack,  GarmSweatpants, "back",       2),
        // Shorts
        GarmentView.Create(ViewShortsFront,     GarmShorts,     "front",      1),
        GarmentView.Create(ViewShortsBack,      GarmShorts,     "back",       2),
        // Gorra
        GarmentView.Create(ViewCapFront,        GarmCap,        "front",      1),
        GarmentView.Create(ViewCapSide,         GarmCap,        "side_left",  2),
        // Tote Bag
        GarmentView.Create(ViewToteFront,       GarmToteBag,    "front",      1),
    ];

    public static PrintZone[] PrintZones =>
    [
        // Camiseta MC (2)
        PrintZone.Create(ZoneTshirtChest,     ViewTshirtFront,     "Pecho Central",      8m,  7m, 15m, 18m, TechSerigrafia),
        PrintZone.Create(ZoneTshirtBack,      ViewTshirtBack,      "Espalda Completa",   5m,  6m, 26m, 26m, TechSerigrafia),
        // Camiseta ML (3)
        PrintZone.Create(ZoneLsChest,         ViewLsFront,         "Pecho Central",      8m,  7m, 15m, 18m, TechSerigrafia),
        PrintZone.Create(ZoneLsBack,          ViewLsBack,          "Espalda Completa",   5m,  6m, 26m, 26m, TechSerigrafia),
        PrintZone.Create(ZoneLsSleeve,        ViewLsSleeve,        "Logo Manga",         2m,  5m,  8m,  8m, TechDtf),
        // Polo (3)
        PrintZone.Create(ZonePoloFrontLeft,   ViewPoloFront,       "Pecho Izquierdo",    6m,  7m, 10m, 10m, TechBordado),
        PrintZone.Create(ZonePoloFrontRight,  ViewPoloFront,       "Pecho Derecho",     14m,  7m, 10m, 10m, TechBordado),
        PrintZone.Create(ZonePoloBack,        ViewPoloBack,        "Espalda Alta",       5m,  5m, 22m, 20m, TechSerigrafia),
        // Buzo Crew (2)
        PrintZone.Create(ZoneCrewneckChest,   ViewCrewneckFront,   "Pecho Central",      7m,  8m, 18m, 20m, TechSerigrafia),
        PrintZone.Create(ZoneCrewneckBack,    ViewCrewneckBack,    "Espalda Completa",   4m,  6m, 28m, 28m, TechSublimacion),
        // Hoodie (3)
        PrintZone.Create(ZoneHoodieChest,     ViewHoodieFront,     "Pecho Central",      8m,  8m, 16m, 18m, TechSerigrafia),
        PrintZone.Create(ZoneHoodieBack,      ViewHoodieBack,      "Espalda Completa",   4m,  6m, 28m, 28m, TechSerigrafia),
        PrintZone.Create(ZoneHoodieHood,      ViewHoodieHood,      "Capota",             3m,  3m, 18m, 14m, TechDtf),
        // Chaqueta (3)
        PrintZone.Create(ZoneJacketFrontLeft, ViewJacketFront,     "Pecho Izquierdo",    5m,  6m, 10m, 10m, TechBordado),
        PrintZone.Create(ZoneJacketBack,      ViewJacketBack,      "Espalda Grande",     4m,  6m, 28m, 26m, TechSerigrafia),
        PrintZone.Create(ZoneJacketSleeve,    ViewJacketSleeve,    "Logo Manga",         2m,  4m,  8m,  8m, TechBordado),
        // PantalÃ³n (2)
        PrintZone.Create(ZoneSweatpantsThigh, ViewSweatpantsFront, "Muslo Derecho",      6m, 18m, 12m, 12m, TechSublimacion),
        PrintZone.Create(ZoneSweatpantsBack,  ViewSweatpantsBack,  "Parte Trasera",      5m,  8m, 20m, 15m, TechDtf),
        // Shorts (2)
        PrintZone.Create(ZoneShortsThigh,     ViewShortsFront,     "Muslo Derecho",      6m, 10m, 12m, 12m, TechSublimacion),
        PrintZone.Create(ZoneShortsBack,      ViewShortsBack,      "Parte Trasera",      5m,  8m, 20m, 15m, TechDtf),
        // Gorra (2)
        PrintZone.Create(ZoneCapFront,        ViewCapFront,        "Frente Gorra",       3m,  4m, 10m,  7m, TechDtf),
        PrintZone.Create(ZoneCapSide,         ViewCapSide,         "Lateral Gorra",      2m,  4m,  7m,  5m, TechBordado),
        // Tote Bag (1)
        PrintZone.Create(ZoneToteFront,       ViewToteFront,       "Cara Frontal",       5m,  8m, 22m, 22m, TechSublimacion),
    ];
}
