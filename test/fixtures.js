// Synthetic AGOL item reports. Column names follow doc.arcgis.com report-fields.htm.
const HDR = 'Title,Item ID,Item Url,Item Type,Date Created,Date Modified,Content Category,View Counts,Owner,File Storage Size,Feature Storage Size,Share Level,# of Groups shared with,Tags,Number of Comments,Is Hosted Service,Date Last Viewed,In Recycle Bin';
const r = (title,type,views,owner,fileMB,featMB,hosted,bin,lastViewed) =>
  [title,'abc123','https://x','' + type,'2024-01-01','2024-06-01','',views,owner,fileMB,featMB,'Org',2,'tag',0,hosted,lastViewed||'2026-09-01',bin].join(',');

module.exports = {
  // plain, well formed
  basic: [HDR,
    r('Parcels','Feature Service',120,'bk',0,512,'TRUE','No'),
    r('Roads','Feature Service',80,'bk',0,256,'TRUE','No'),
    r('Aerials 2024','Image Service',40,'bk',2048,0,'TRUE','No'),
    r('Site plan','PDF',5,'bk',12,0,'FALSE','No'),
  ].join('\n'),

  // quoted commas, embedded quotes, CRLF, BOM
  gnarly: '﻿' + [HDR,
    '"Parcels, County of Example",abc,https://x,Feature Service,2024-01-01,2024-06-01,,10,bk,0,100,Org,1,t,0,TRUE,2026-01-01,No',
    '"He said ""hello"" layer",abc,https://x,Feature Service,2024-01-01,2024-06-01,,0,bk,0,50,Org,1,t,0,TRUE,2026-01-01,No',
  ].join('\r\n') + '\r\n',

  // recycle bin and zero-view waste
  waste: [HDR,
    r('Live layer','Feature Service',500,'bk',0,1000,'TRUE','No'),
    r('Deleted big','Feature Service',10,'bk',0,4000,'TRUE','Yes'),
    r('Never opened','Image Service',0,'bk',3000,0,'TRUE','No'),
  ].join('\n'),

  // header variants: different case, units in parentheses, extra columns, reordered
  variants: [
    'ITEM TYPE,title,file storage size (MB),Feature Storage Size (MB),In Recycle Bin,View Counts,Extra Column',
    'Feature Service,Parcels,0,200,No,10,ignored',
    'PDF,Doc,5,0,No,3,ignored',
  ].join('\n'),

  // thousands separators and blank trailing lines
  commas: [HDR,
    '"Big layer",abc,https://x,Feature Service,2024-01-01,2024-06-01,,"1,200",bk,"0","10,240",Org,1,t,0,TRUE,2026-01-01,No',
    '',
    '',
  ].join('\n'),

  // not an item report
  wrongFile: 'Organization,StartTime,EndTime,Credits consumed by,File Storage,Feature Storage\nAcme,1,2,bk,10,20',

  headerOnly: HDR,
  empty: ''
};

// Real Timmons Group export header, verbatim, with invented rows. Confirms the
// parser against the format ArcGIS Online actually produces, not the documented one.
module.exports.realHeader = [
'Title,Item ID,Item Url,Item Type,Date Created,Date Modified,Content Category,View Counts,Owner,File Storage Size,Feature Storage Size,Share Level,"# of Groups shared with",Tags,Number of Comments,Is Hosted Service,Date Last Viewed,In Recycle Bin',
'" (PDF) (WEST)",5eff,,PDF,2023-06-26 15:47:53,2023-06-26 15:47:58,[/Categories/Mapping Application/Layers/General],7,someone@example.com_Example_Org,8.58761,0.0,group,1,,0,False,2023-07-05 20:00:00,No',
'" leading space layer",7553,https://services.arcgis.com/x/FeatureServer,Feature Service,2024-10-15 14:38:14,2024-10-15 14:39:44,,46,someone@example.com_Example_Org,0.0,0.0625,group,1,Environmental,0,True,2025-08-26 12:00:00,No',
'"Binned thing",9001,,Feature Service,2024-01-01 00:00:00,2024-01-02 00:00:00,,0,someone@example.com_Example_Org,0.0,1024.0,private,0,,0,True,2025-01-01 00:00:00,Yes'
].join('\n');

// Real credit report shape: three preamble lines before the header row.
module.exports.realCreditReport = [
'Organization: Example Org',
'StartTime:    1785542400',
'EndTime:      1788220799',
'Credits Consumed by,App Title,Notebooks - Interactive,Geocoding,Feature Storage,File Storage,Imagery Storage,Tile Storage',
'Example Org,,0.0,0.0,195.69,410.62,300.97,221.81'
].join('\n');
