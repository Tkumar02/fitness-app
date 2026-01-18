import { db } from "@/firebase";
import { collection, limit, onSnapshot, orderBy, query, where } from "firebase/firestore";
import { useEffect, useState } from "react";

export default function CommunityFeed() {
    const [loading, setLoading] = useState(true);
    const [activites, setActivities] = useState<any>([]);
    const [refreshing, setRefreshing] = useState(false);


useEffect(() => {
    const q = query(
        collection(db, "activities"),
        where("isPublic",'==',true),
        orderBy("createdAt", "desc"),
        limit(20)
    );

    const unsubscribe = onSnapshot(q, (snapshot) => {
        const feedData = snapshot.docs.map(doc => ({
            id:doc.id,
            ...doc.data()
        }));

        setActivities(feedData);
        setLoading(false);
        setRefreshing(false);
    }, (error)=> {
        console.error('feed error', error);
        setLoading(false)
    })

})}