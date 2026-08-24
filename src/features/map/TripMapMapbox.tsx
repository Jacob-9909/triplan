"use client";

import Map, { Marker, NavigationControl, Popup, Source, Layer } from "react-map-gl/mapbox";
import "mapbox-gl/dist/mapbox-gl.css";
import TripMapCore from "./TripMapCore";
import type { TripMapCoreProps } from "./TripMapCore";
import { adaptKitComponent, type MapKit } from "./mapKit";

const kit: MapKit = {
  Map: adaptKitComponent(Map),
  Marker: adaptKitComponent(Marker),
  Popup: adaptKitComponent(Popup),
  NavigationControl: adaptKitComponent(NavigationControl),
  Source: adaptKitComponent(Source),
  Layer: adaptKitComponent(Layer),
};

/** 선택적 클라우드 모드 — NEXT_PUBLIC_MAPBOX_TOKEN이 있을 때만 사용 (outdoors-v12) */
export default function TripMapMapbox({
  accessToken,
  ...props
}: Omit<TripMapCoreProps, "kit" | "mapStyle"> & { accessToken?: string }) {
  return (
    <TripMapCore
      {...props}
      kit={kit}
      mapStyle="mapbox://styles/mapbox/outdoors-v12"
      accessToken={accessToken}
    />
  );
}
