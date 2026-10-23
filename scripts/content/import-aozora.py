#!/usr/bin/env python3
"""Cut excerpts from Aozora Bunko (public-domain literature with human-made furigana) into
data/japanese/passages/aozora-excerpts.json.

Each excerpt is located by the first and last words of the passage, so the Japanese is copied from
the source, never retyped. Questions, options and meanings (EN/ID) are our own.

    python3 scripts/content/import-aozora.py && npx prettier --write data/japanese/passages/aozora-excerpts.json
"""
import io, json, re, urllib.request, zipfile
from pathlib import Path

OUT = Path(__file__).resolve().parents[2] / "data/japanese/passages/aozora-excerpts.json"
BASE = "https://www.aozora.gr.jp/cards"
WORKS = {
    "gon": dict(author="新美南吉", work="ごん狐", card="000121/card628.html", zip="000121/files/628_ruby_649.zip"),
    "tebukuro": dict(author="新美南吉", work="手袋を買いに", card="000121/card637.html", zip="000121/files/637_ruby_4095.zip"),
    "kumo": dict(author="芥川龍之介", work="蜘蛛の糸", card="000879/card92.html", zip="000879/files/92_ruby_164.zip"),
}
LICENSE = "Public domain (Aozora Bunko)"

def q(en_q, en_o, id_q, id_o, en_g, id_g):
    return {"en": {"question": en_q, "options": en_o, "gloss": en_g}, "id": {"question": id_q, "options": id_o, "gloss": id_g}}

EXCERPTS = [
 ("gon-storyteller", "paragraph", "gon", "これは、私《わたし》が", "おられたそうです。", q(
   "Who told the writer this story?", ["An old man from the village called Mohei", "The writer's mother", "A lord named Nakayama", "A fox named Gon"],
   "Siapa yang menceritakan kisah ini kepada penulis?", ["Seorang kakek dari desa bernama Mohei", "Ibu penulis", "Seorang tuan tanah bernama Nakayama", "Seekor rubah bernama Gon"],
   "This is a story I heard when I was little from an old man in our village called Mohei. Long ago, near our village, in a place called Nakayama, there was a small castle, and they say a lord called Lord Nakayama lived there.",
   "Ini cerita yang saya dengar waktu kecil dari seorang kakek di desa kami bernama Mohei. Dahulu kala, di dekat desa kami, di tempat bernama Nakayama, ada sebuah kastil kecil, dan konon di sana tinggal seorang tuan bernama Tuan Nakayama.")),
 ("tebukuro-snow", "paragraph", "tebukuro", "母さん狐は洞穴の入口から外へ出て", "思ったのでした。", q(
   "Why did the little fox think something had stuck in his eye?", ["The sun reflected very strongly off the fresh snow", "A branch hit him", "Snow fell into his eye", "His mother touched his eye"],
   "Mengapa anak rubah mengira ada sesuatu yang menusuk matanya?", ["Matahari memantul sangat terang dari salju yang baru turun", "Sebuah ranting mengenainya", "Salju masuk ke matanya", "Ibunya menyentuh matanya"],
   "Mother fox went outside the burrow and only then understood. A great deal of pure white snow had fallen during the night. The sun was shining down on it, so the snow reflected dazzlingly. The little fox, who had never seen snow, got such a strong glare that he thought something had pricked his eye.",
   "Rubah ibu keluar dari pintu liang dan baru saat itu mengerti. Semalam salju putih bersih turun begitu banyak. Matahari menyinarinya dengan cerah, sehingga salju memantulkan cahaya sampai menyilaukan. Anak rubah yang belum pernah melihat salju terkena pantulan yang begitu kuat, jadi ia mengira ada sesuatu yang menusuk matanya.")),
 ("tebukuro-mother", "paragraph", "tebukuro", "「お母ちゃん、お手々が冷たい", "買ってやろうと思いました。", q(
   "What did the mother fox decide to do?", ["Buy woolen mittens for her child in town that night", "Take her child to a doctor", "Stay in the burrow all winter", "Dry her child's hands by the fire"],
   "Apa yang diputuskan ibu rubah?", ["Membelikan sarung tangan wol untuk anaknya di kota malam itu", "Membawa anaknya ke dokter", "Tinggal di liang sepanjang musim dingin", "Mengeringkan tangan anaknya di dekat api"],
   "“Mama, my hands are cold, my hands are tingling,” he said, holding out his wet, peony-pink hands to mother fox. She breathed warm breath on them and wrapped them gently in her own warm hands. “They'll be warm soon. Touching snow always makes you warm,” she said, but she thought it would be a pity if her dear little one got chilblains, so when night came she would go to town and buy him woolen mittens that fit his little hands.",
   "“Ibu, tanganku dingin, tanganku perih,” katanya sambil mengulurkan kedua tangannya yang basah dan berwarna merah muda ke depan ibu rubah. Ibu rubah menghembuskan napas hangat ke tangan itu dan membungkusnya dengan lembut dalam tangannya yang hangat. “Sebentar lagi hangat. Kalau menyentuh salju, nanti pasti jadi hangat,” katanya. Tetapi ia khawatir tangan anaknya yang manis akan melepuh karena dingin, jadi begitu malam tiba ia berniat pergi ke kota dan membelikan sarung tangan wol yang pas untuk tangan kecil anaknya.")),
 ("gon-rain", "paragraph", "gon", "或《ある》秋《あき》のことでした。", "ひびいていました。", q(
   "What did Gon do when the rain stopped?", ["He crawled out of his hole", "He went to the village", "He stayed in his hole", "He went fishing"],
   "Apa yang dilakukan Gon setelah hujan berhenti?", ["Ia merangkak keluar dari liangnya", "Ia pergi ke desa", "Ia tetap di dalam liang", "Ia pergi memancing"],
   "It was one autumn day. For two or three days the rain kept falling, and Gon could not even go outside, crouching in his hole. When the rain cleared, Gon crawled out of the hole, relieved. The sky was perfectly clear, and the shrikes' calls rang out sharply.",
   "Pada suatu hari di musim gugur. Hujan turun terus selama dua tiga hari, dan selama itu Gon tidak bisa keluar sama sekali dan meringkuk di dalam liangnya. Begitu hujan reda, Gon merasa lega dan merangkak keluar dari liang. Langit cerah sekali, dan suara burung bentet terdengar nyaring.")),
 ("gon-fish", "paragraph", "gon", "兵十がいなくなると、", "ぽんぽんなげこみました。", q(
   "What did Gon do with Hyoju's fish?", ["Threw them into the river", "Ate them", "Carried them home", "Hid them in the grass"],
   "Apa yang Gon lakukan pada ikan milik Hyoju?", ["Melemparkannya kembali ke sungai", "Memakannya", "Membawanya pulang", "Menyembunyikannya di rumput"],
   "When Hyoju was gone, Gon leapt out of the grass and dashed over to the fish basket. He felt like playing a little prank. Gon grabbed the fish from the basket and tossed them one after another, plop, into the river below where the fishing net was set.",
   "Begitu Hyoju pergi, Gon melompat keluar dari rumput dan berlari ke dekat keranjang ikan. Ia tiba-tiba ingin berbuat iseng. Gon menyambar ikan-ikan dari dalam keranjang dan melemparkannya satu per satu, plop, ke sungai di sebelah hilir tempat jaring dipasang.")),
 ("kumo-lotus", "authentic", "kumo", "ある日の事でございます。", "朝なのでございましょう。", q(
   "Where is the Buddha walking?", ["Beside a lotus pond in paradise", "On the bottom of hell", "In a forest", "In a village"],
   "Di mana Sang Buddha berjalan?", ["Di tepi kolam teratai di surga", "Di dasar neraka", "Di dalam hutan", "Di sebuah desa"],
   "It happened one day. The Buddha was strolling alone along the edge of the lotus pond in paradise. The lotus flowers blooming in the pond were all pure white like jewels, and from the golden centres a wonderful fragrance beyond words overflowed ceaselessly. It must have been just morning in paradise.",
   "Pada suatu hari. Sang Buddha berjalan-jalan seorang diri di tepi kolam teratai di surga. Bunga-bunga teratai yang mekar di kolam semuanya putih bersih bagaikan permata, dan dari putik emas di tengahnya mengalir wangi harum tak terkatakan tanpa henti ke sekelilingnya. Di surga saat itu tampaknya sedang pagi.")),
 ("kumo-hell-view", "authentic", "kumo", "やがて御釈迦様はその池のふちに", "見えるのでございます。", q(
   "What could the Buddha see through the water of the pond?", ["The bottom of hell, with the river and the mountain of needles", "The village below", "The sky", "Only his own face"],
   "Apa yang dapat dilihat Sang Buddha melalui air kolam?", ["Dasar neraka, dengan sungai dan gunung jarumnya", "Desa di bawah", "Langit", "Hanya wajahnya sendiri"],
   "Soon the Buddha stopped at the edge of the pond and happened to look at the scene below between the lotus leaves covering the water's surface. The bottom of this paradise lotus pond lies exactly over the bottom of hell, so through the crystal-like water the River of Three Crossings and the Mountain of Needles can be seen clearly, as if through a peep-glass.",
   "Tak lama Sang Buddha berhenti di tepi kolam itu dan secara kebetulan melihat pemandangan di bawah, di antara daun-daun teratai yang menutupi permukaan air. Dasar kolam teratai di surga ini tepat berada di atas dasar neraka, sehingga melalui air yang jernih bagai kristal, Sungai Sanzu dan Gunung Jarum tampak jelas, seperti dilihat lewat kaca pengintai.")),
 ("tebukuro-night", "authentic", "tebukuro", "暗い暗い夜が", "浮びあがっていました。", q(
   "Why did the snow still look white at night?", ["It was so white that it stood out even wrapped in darkness", "The moon was full", "The fox lit a lamp", "It kept snowing"],
   "Mengapa salju tetap tampak putih di malam hari?", ["Salju begitu putih sehingga tetap tampak walau diselimuti gelap", "Bulan sedang purnama", "Rubah menyalakan lampu", "Salju terus turun"],
   "The dark, dark night spread a shadow like a wrapping cloth and came to wrap the fields and woods, but the snow was so white that however much it was wrapped, it still stood out white.",
   "Malam yang sangat gelap datang menebarkan bayangan bagaikan kain pembungkus untuk menyelimuti ladang dan hutan, tetapi salju begitu putih sehingga walau diselimuti berkali-kali, ia tetap tampak putih.")),
 ("tebukuro-avalanche", "authentic", "tebukuro", "すると突然、うしろで、", "こぼれていました。", q(
   "What made the loud noise behind the little fox?", ["Snow sliding off a fir branch", "A hunter", "His mother", "A falling tree"],
   "Apa yang menimbulkan suara keras di belakang anak rubah?", ["Salju yang longsor dari ranting pohon cemara", "Seorang pemburu", "Ibunya", "Pohon tumbang"],
   "Suddenly, behind him, there was a tremendous sound, “thud thud, swoosh,” and powder snow like breadcrumbs fell softly over the little fox. Startled, he rolled through the snow and ran ten metres away. He wondered what it was and looked back, but nothing was there. It was snow that had slid off a fir branch. Snow was still spilling down between the branches like white silk thread.",
   "Tiba-tiba di belakangnya terdengar bunyi dahsyat, “dubrak, sraaak”, dan salju halus seperti remah roti jatuh menimpa anak rubah. Terkejut, ia berguling di salju dan lari sepuluh meter jauhnya. Ia bertanya-tanya apa itu dan menoleh ke belakang, tetapi tidak ada apa-apa. Rupanya salju longsor dari ranting pohon cemara. Di sela-sela ranting, salju masih tumpah seperti benang sutra putih.")),
]

# Our own estimate of the level a learner needs to read each excerpt with furigana and the meaning.
LEVEL = {"gon-storyteller": "n4", "tebukuro-snow": "n4", "tebukuro-mother": "n4", "gon-rain": "n4", "gon-fish": "n4",
         "tebukuro-night": "n3", "tebukuro-avalanche": "n3", "kumo-lotus": "n2", "kumo-hell-view": "n2"}

def fetch(key):
    w = WORKS[key]
    raw = urllib.request.urlopen(f"{BASE}/{w['zip']}", timeout=60).read()
    z = zipfile.ZipFile(io.BytesIO(raw))
    name = next(n for n in z.namelist() if n.endswith(".txt"))
    text = z.read(name).decode("cp932")
    body = text.split("-------------------------------------------------------\n")[-1]
    body = body.split("\n底本：")[0]
    body = re.sub(r"［＃[^］]*］", "", body)  # editor notes (emphasis dots, headings)
    return body

def cut(body, start, end):
    i = body.index(start)
    j = body.index(end, i) + len(end)
    chunk = body[i:j].replace("\n", "").replace("　", "")
    assert "※" not in chunk, "excerpt contains a character the source could not encode"
    return chunk

def main():
    bodies = {k: fetch(k) for k in WORKS}
    items = []
    for slug, form, work, start, end, tr in EXCERPTS:
        w = WORKS[work]
        items.append({
            "slug": slug, "form": form, "level": LEVEL[slug], "lines": [{"text": cut(bodies[work], start, end)}], "answer": 0,
            "credit": {"author": w["author"], "work": w["work"], "url": f"{BASE}/{w['card']}", "license": LICENSE},
            "comprehension": tr,
        })
    OUT.write_text(json.dumps({"source": "Aozora Bunko (https://www.aozora.gr.jp/)", "level": "n5", "items": items}, ensure_ascii=False, indent=2) + "\n")
    print(f"{len(items)} excerpts -> {OUT}")

main()
