#!/bin/bash
# Download ALL service images from primesign.in with proper browser headers
# The server blocks direct curl requests (403) - needs User-Agent + Referer

BASE="https://primesign.in"
UA="Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36"
REF="https://www.primesign.in/"
CURL="curl -sL -H 'User-Agent: $UA' -H 'Referer: $REF'"

mkdir -p public/images/services/sign-boards
mkdir -p public/images/services/promotional

echo "=== Non-Light Sign Boards ==="
for i in 1 2 3; do
  eval $CURL "$BASE/images/nonlightsign/$i.png" -o "public/images/services/sign-boards/nonlight-$i.png"
done

echo "=== Acrylic Sign Boards ==="
for i in 1 2 3 4 5 6; do
  eval $CURL "$BASE/images/Acyrlic%20Sign%20Board/$i.png" -o "public/images/services/sign-boards/acrylic-$i.png"
done

echo "=== PVC & SS ==="
for i in 1 2 3 4 5 6 7 8; do
  eval $CURL "$BASE/images/pvc%26ss/$i.png" -o "public/images/services/sign-boards/pvc-ss-$i.png"
done

echo "=== Hoardings ==="
for i in 1 2 3 4 5 6; do
  eval $CURL "$BASE/images/Hordings/$i.png" -o "public/images/services/sign-boards/hoardings-$i.png"
done

echo "=== Glow Sign Boards ==="
for i in 1 2 3 4 5 6 7 8 9 10; do
  eval $CURL "$BASE/images/Glow%20Sign%20Board/$i.png" -o "public/images/services/sign-boards/glow-$i.png"
done

echo "=== Wall Graphics ==="
for i in 1 2 3 4 5 6 7 8 9 10 11; do
  eval $CURL "$BASE/images/Wall%20Graphics/$i.jpg" -o "public/images/services/sign-boards/wall-$i.jpg"
done

echo "=== Vehicle Branding ==="
for i in 1 2 3 4 5 6 7 8 9 10 11; do
  eval $CURL "$BASE/images/Vehicle%20Branding/$i.jpg" -o "public/images/services/sign-boards/vehicle-$i.jpg"
done

echo "=== LED Board ==="
for i in 1 1.1 2 2.1 3 3.1 4 4.1 5 5.1; do
  fname=$(echo "$i" | tr '.' '_')
  eval $CURL "$BASE/images/LED%20Board/$i.png" -o "public/images/services/sign-boards/led-${fname}.png"
done

echo "=== Promotional Tents ==="
for i in 1 2 3 4; do
  eval $CURL "$BASE/images/promotionaltent/$i.png" -o "public/images/services/promotional/tent-$i.png"
done

echo "=== Roll Up Standees ==="
for i in 1 2 3; do
  eval $CURL "$BASE/images/Roll%20Up%20Standees/$i.png" -o "public/images/services/promotional/rollup-$i.png"
done

echo "Download complete!"
ls -la public/images/services/sign-boards/ | wc -l
ls -la public/images/services/promotional/ | wc -l