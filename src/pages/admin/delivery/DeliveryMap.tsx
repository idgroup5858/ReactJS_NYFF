import { AdvancedMarker, Circle, ControlPosition, Map, MapControl, Pin, Polygon, Polyline, useMap, type MapMouseEvent } from '@vis.gl/react-google-maps'
import { LoaderCircle, LocateFixed, Store } from 'lucide-react'
import { useEffect, useState } from 'react'
import { insertPoint } from '@/domain/geo'
import { hasZone } from '@/domain/rules'
import type { Branch, ID, LatLng } from '@/domain/types'
import { useT } from '@/i18n'
import { showToast } from '@/lib/swal'
import type { DrawTool } from './draft'

export interface MapEditing {
  branchId: ID
  zone: LatLng[]
  location: LatLng | null
  tool: DrawTool
}

type Props = {
  branches: Branch[]
  colorOf: (branchId: ID) => string
  /** tahrirlanayotgan filial — uning hududi va pini xaritada surib o'zgartiriladi */
  editing: MapEditing | null
  onZone: (zone: LatLng[]) => void
  onLocation: (location: LatLng) => void
  onSelect: (branchId: ID) => void
  /** "Tekshirish": bosilgan nuqta va buyurtma tushadigan filial (ular orasida uzuq chiziq) */
  testPoint: LatLng | null
  testTarget: Branch | null
  onTestPoint: (point: LatLng) => void
}

const TASHKENT: LatLng = { lat: 41.3111, lng: 69.2797 }

function boundsOf(points: LatLng[]): google.maps.LatLngBoundsLiteral | null {
  if (points.length === 0) return null
  const lats = points.map((p) => p.lat)
  const lngs = points.map((p) => p.lng)
  return { north: Math.max(...lats), south: Math.min(...lats), east: Math.max(...lngs), west: Math.min(...lngs) }
}

const branchPoints = (branch: Branch) => [...branch.deliveryZone, ...(branch.location ? [branch.location] : [])]

/**
 * Tanlangan filial (yoki hammasi) ko'rinadigan qilib kamerani suradi. Nuqtalar birinchi chizilgandagisi olinadi —
 * kamera chizish paytida sakramaydi; filial almashganda komponent `key` bilan qayta yaratiladi.
 */
function FitTo({ points }: { points: LatLng[] }) {
  const map = useMap()
  const [initial] = useState(points)
  useEffect(() => {
    const bounds = boundsOf(initial)
    if (!map || !bounds) return
    if (initial.length === 1) {
      map.panTo(initial[0])
      map.setZoom(14)
    } else {
      map.fitBounds(bounds, 56)
    }
  }, [map, initial])
  return null
}

type MyLocation = { point: LatLng; accuracy: number }

/**
 * "Mening joylashuvim" (Google Maps'dagidek o'ng pastda): brauzer joylashuvi bo'yicha xaritani o'sha yerga olib boradi
 * va ko'k nuqta qo'yadi. Ruxsat faqat tugma bosilganda so'raladi.
 */
function LocateControl({ onLocated }: { onLocated: (location: MyLocation) => void }) {
  const t = useT()
  const map = useMap()
  const [busy, setBusy] = useState(false)

  const locate = () => {
    if (!('geolocation' in navigator)) {
      showToast(t.admin.delivery.locateFailed, 'error')
      return
    }
    setBusy(true)
    navigator.geolocation.getCurrentPosition(
      ({ coords }) => {
        setBusy(false)
        const point = { lat: coords.latitude, lng: coords.longitude }
        map?.panTo(point)
        map?.setZoom(15)
        onLocated({ point, accuracy: coords.accuracy })
      },
      (error) => {
        setBusy(false)
        showToast(error.code === error.PERMISSION_DENIED ? t.admin.delivery.locateDenied : t.admin.delivery.locateFailed, 'error')
      },
      { enableHighAccuracy: true, timeout: 15_000, maximumAge: 60_000 },
    )
  }

  return (
    <MapControl position={ControlPosition.RIGHT_BOTTOM}>
      <button
        type="button"
        onClick={locate}
        disabled={busy}
        title={t.admin.delivery.locate}
        aria-label={t.admin.delivery.locate}
        className="m-2.5 flex h-10 w-10 cursor-pointer items-center justify-center rounded-sm bg-white text-neutral-600 shadow-[0_1px_4px_-1px_rgba(0,0,0,0.3)] transition-colors hover:text-neutral-950"
      >
        {busy ? <LoaderCircle size={20} className="animate-spin" /> : <LocateFixed size={20} />}
      </button>
    </MapControl>
  )
}

type MapType = 'roadmap' | 'hybrid'

/** Xarita / Sputnik (sputnik — ko'cha nomlari bilan): Google'ning o'z tugmasi o'rniga, til va ko'rinish bizniki. */
function MapTypeControl({ value, onChange }: { value: MapType; onChange: (value: MapType) => void }) {
  const t = useT()
  const labels: Record<MapType, string> = { roadmap: t.admin.delivery.mapRoadmap, hybrid: t.admin.delivery.mapSatellite }
  return (
    <MapControl position={ControlPosition.TOP_LEFT}>
      <div className="m-2.5 flex overflow-hidden rounded-sm bg-white shadow-[0_1px_4px_-1px_rgba(0,0,0,0.3)]">
        {(Object.keys(labels) as MapType[]).map((type) => (
          <button
            key={type}
            type="button"
            onClick={() => onChange(type)}
            aria-pressed={value === type}
            className={`h-10 cursor-pointer px-4 text-sm transition-colors ${value === type ? 'bg-neutral-100 font-bold text-neutral-950' : 'font-medium text-neutral-500 hover:text-neutral-950'}`}
          >
            {labels[type]}
          </button>
        ))}
      </div>
    </MapControl>
  )
}

/** Ko'k nuqta va aniqlik doirasi; bosishni o'tkazib yuboradi — ustidan hudud chizish mumkin. */
function MyLocationDot({ location }: { location: MyLocation }) {
  return (
    <>
      {location.accuracy < 3000 && (
        <Circle center={location.point} radius={location.accuracy} clickable={false} fillColor="#0ea5e9" fillOpacity={0.12} strokeColor="#0ea5e9" strokeOpacity={0.4} strokeWeight={1} />
      )}
      <AdvancedMarker position={location.point} anchorLeft="-50%" anchorTop="-50%" zIndex={5} style={{ pointerEvents: 'none' }}>
        <span className="relative flex h-4 w-4">
          <span className="absolute inset-0 animate-ping rounded-full bg-sky-400 opacity-60" />
          <span className="relative h-4 w-4 rounded-full border-2 border-white bg-sky-500 shadow" />
        </span>
      </AdvancedMarker>
    </>
  )
}

/** Filial pini: nomi va rangli doirada do'kon belgisi. */
function BranchPin({ name, color, dimmed }: { name: string; color: string; dimmed: boolean }) {
  return (
    <div className={`flex flex-col items-center ${dimmed ? 'opacity-60' : ''}`}>
      <span className="mb-1 rounded-full bg-white px-2 py-0.5 text-[11px] font-extrabold whitespace-nowrap text-neutral-900 shadow ring-1 ring-black/10">{name}</span>
      <span className="flex h-9 w-9 items-center justify-center rounded-full border-[3px] border-white text-white shadow-lg" style={{ background: color }}>
        <Store size={16} />
      </span>
    </div>
  )
}

/**
 * Tahrirlanayotgan hudud: uchlarini surish, qirradagi o'rta nuqtani tortib yangi uch qo'shish (Google'ning o'zi),
 * o'ng tugma bilan uchni o'chirish. Uchlari 3 tadan kam bo'lsa poligon ko'rinmaydi — nuqtalar alohida chiziladi.
 */
function EditableZone({ zone, color, onZone, onPlace }: { zone: LatLng[]; color: string; onZone: (zone: LatLng[]) => void; onPlace: (point: LatLng) => void }) {
  const [polygon, setPolygon] = useState<google.maps.Polygon | null>(null)

  useEffect(() => {
    if (!polygon) return
    const listener = polygon.addListener('contextmenu', (event: google.maps.PolyMouseEvent) => {
      if (typeof event.vertex === 'number') onZone(zone.filter((_, index) => index !== event.vertex))
    })
    return () => listener.remove()
  }, [polygon, zone, onZone])

  return (
    <>
      <Polygon
        ref={setPolygon}
        paths={zone}
        editable
        draggable={false}
        strokeColor={color}
        strokeWeight={3}
        fillColor={color}
        fillOpacity={0.25}
        zIndex={10}
        onPathsChanged={(paths) => onZone((paths[0] ?? []).map((point) => point.toJSON()))}
        // hudud ichini bosish ham xaritani bosish kabi (uch yoki qirra tutqichini bosish — tahrirlash)
        onClick={(event) => {
          const { vertex, edge } = event as google.maps.PolyMouseEvent
          if (typeof vertex !== 'number' && typeof edge !== 'number' && event.latLng) onPlace(event.latLng.toJSON())
        }}
      />
      {zone.length < 3 &&
        zone.map((point, index) => (
          <AdvancedMarker key={index} position={point} anchorLeft="-50%" anchorTop="-50%" zIndex={20}>
            <span className="block h-3.5 w-3.5 rounded-full border-2 border-white shadow" style={{ background: color }} />
          </AdvancedMarker>
        ))}
    </>
  )
}

/** Yetkazib berish xaritasi: filiallar hududi (har biri o'z rangida) va pini; tahrirlash va tekshirish rejimlari. */
export default function DeliveryMap({ branches, colorOf, editing, onZone, onLocation, onSelect, testPoint, testTarget, onTestPoint }: Props) {
  const [initialBounds] = useState(() => boundsOf(branches.flatMap(branchPoints)))
  const [me, setMe] = useState<MyLocation | null>(null)
  const [mapType, setMapType] = useState<MapType>('roadmap')
  const fitPoints = editing ? [...editing.zone, ...(editing.location ? [editing.location] : [])] : branches.flatMap(branchPoints)

  const place = (point: LatLng) => {
    if (!editing) onTestPoint(point)
    else if (editing.tool === 'zone') onZone(insertPoint(editing.zone, point))
    else onLocation(point)
  }

  return (
    <Map
      mapId="DEMO_MAP_ID"
      defaultBounds={initialBounds ? { ...initialBounds, padding: 48 } : undefined}
      defaultCenter={initialBounds ? undefined : TASHKENT}
      defaultZoom={initialBounds ? undefined : 12}
      gestureHandling="greedy"
      clickableIcons={false}
      streetViewControl={false}
      mapTypeControl={false}
      mapTypeId={mapType}
      disableDoubleClickZoom={editing !== null}
      draggableCursor={editing ? 'crosshair' : null}
      onClick={(event: MapMouseEvent) => {
        if (event.detail.latLng) place(event.detail.latLng)
      }}
      className="h-full w-full"
    >
      <FitTo key={editing?.branchId ?? 'all'} points={fitPoints} />
      <MapTypeControl value={mapType} onChange={setMapType} />
      <LocateControl onLocated={setMe} />
      {me && <MyLocationDot location={me} />}

      {branches.map((branch) => {
        if (branch.id === editing?.branchId || !hasZone(branch)) return null
        const color = colorOf(branch.id)
        return (
          <Polygon
            key={branch.id}
            paths={branch.deliveryZone}
            clickable={false}
            strokeColor={color}
            strokeOpacity={editing ? 0.5 : 0.9}
            strokeWeight={2}
            fillColor={color}
            fillOpacity={editing ? 0.08 : 0.18}
          />
        )
      })}

      {editing && <EditableZone zone={editing.zone} color={colorOf(editing.branchId)} onZone={onZone} onPlace={place} />}

      {branches.map((branch) => {
        const own = editing !== null && branch.id === editing.branchId
        const position = own ? editing.location : branch.location
        if (!position) return null
        return (
          <AdvancedMarker
            key={`pin-${branch.id}`}
            position={position}
            title={branch.name}
            zIndex={own ? 40 : 25}
            draggable={own && editing.tool === 'location'}
            onDragEnd={(event) => {
              if (event.latLng) onLocation(event.latLng.toJSON())
            }}
            onClick={editing ? undefined : () => onSelect(branch.id)}
          >
            <BranchPin name={branch.name} color={colorOf(branch.id)} dimmed={editing !== null && !own} />
          </AdvancedMarker>
        )
      })}

      {testPoint && !editing && (
        <>
          {testTarget?.location && (
            <Polyline
              path={[testPoint, testTarget.location]}
              clickable={false}
              strokeOpacity={0}
              zIndex={15}
              icons={[{ icon: { path: 'M 0,-1 0,1', strokeColor: colorOf(testTarget.id), strokeOpacity: 1, strokeWeight: 3, scale: 3 }, offset: '0', repeat: '14px' }]}
            />
          )}
          <AdvancedMarker position={testPoint} zIndex={50}>
            <Pin background="#171717" borderColor="#000000" glyphColor="#facc15" />
          </AdvancedMarker>
        </>
      )}
    </Map>
  )
}
