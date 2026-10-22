import { useState } from "react";
import { Link } from "react-router-dom";
import Navigation from "@/components/Navigation";
import { Card } from "@/components/ui/card";
import { useScannedCards } from "@/hooks/useScannedCards";
import { useLanguage } from "@/contexts/LanguageContext";
import { convertPriceRange } from "@/utils/currency";
import CollectionCardEditor from "./CollectionCardEditor";
import { Button } from "./ui/button";

export default function ScannedCardDetail({ id }: { id: string }) {
  const { cards, isLoading, error } = useScannedCards();
  const [grade, setGrade] = useState("ungraded");
  const [editing, setEditing] = useState(false);
  const { currency } = useLanguage();
  const card = cards.find(candidate => candidate.id === id);
  const price = card?.priceByGrade?.[grade] ?? (grade === "ungraded" ? card?.estimatedValue : undefined);
  return <div className="min-h-screen bg-background">
    <Navigation />
    <main className="container mx-auto px-4 pt-24 pb-16 max-w-5xl">
      <Link className="text-primary underline" to="/collection">Tillbaka till samlingen</Link>
      {isLoading ? <p role="status">Laddar kort...</p> : error ? <p role="alert">{error}</p> : !card ?
        <p role="alert">Kortet finns inte i den aktuella samlingen. Kontrollera att du är inloggad på rätt konto.</p> :
        <div className="grid md:grid-cols-2 gap-8 mt-6">
          <Card className="p-4">{card.image ? <img src={card.image} alt={card.name} className="w-full object-contain" /> : <p>Ingen bild tillgänglig</p>}</Card>
          <Card className="p-6 space-y-4">
            <h1 className="text-3xl font-bold">{card.name}</h1>
            <Button variant="outline" onClick={() => setEditing(true)}>Redigera kort</Button>
            <p>{card.set} · #{card.number}</p>
            <p>{card.quantity ?? 1} exemplar · {card.language ?? "en"} · {card.variant ?? "normal"}</p>
            {card.location && <p>Förvaringsplats: {card.location}</p>}
            {card.notes && <p className="whitespace-pre-wrap">{card.notes}</p>}
            <p>Typ: {card.type} · Sällsynthet: {card.rarity}</p>
            {card.hp && <p>HP: {card.hp}</p>}
            {card.condition && <p>Skick: {card.condition}</p>}
            {card.description && <p>{card.description}</p>}
            {card.attacks.map((attack, index) => <div key={index}><h2 className="font-semibold">{attack.name} {attack.damage}</h2><p>{attack.cost.join(", ")}</p>{attack.text && <p>{attack.text}</p>}</div>)}
            <label className="block">Gradering
              <select value={grade} onChange={event => setGrade(event.target.value)} className="block w-full p-2 bg-background border rounded mt-2">
                <option value="ungraded">Ograderat</option>
                {Array.from({ length: 10 }, (_, index) => <option key={index} value={`psa${index + 1}`}>PSA {index + 1}</option>)}
              </select>
            </label>
            <p className="text-xl font-bold text-primary">Uppskattat värde: {price ? convertPriceRange(price, currency) : "Pris saknas"}</p>
          </Card>
        </div>}
      {card && <CollectionCardEditor key={card.id} card={card} open={editing} onOpenChange={setEditing} />}
    </main>
  </div>;
}
