"use client";

import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import { AvatarStack } from "@/components/ui/avatar-group";
import { FullScreenChatDeck } from "@/components/FullScreenChatDeck";

function ReverseOrder() {
  return (
    <div className="flex flex-row-reverse justify-end -space-x-3 space-x-reverse *:ring *:ring-background">
      <Avatar>
        <AvatarImage src="https://cdn.21st.dev/assets/localized/d1ed44cae2562d30f25fc797e01dc5b639ec45375dc4079fca370e2bf417d2ee.webp" />
        <AvatarFallback>U1</AvatarFallback>
      </Avatar>
      <Avatar>
        <AvatarImage src="https://cdn.21st.dev/assets/localized/55af7e180cc86b6c1cfc029601e5a89c3e3530fef7ef25d4818baa4341557a8d.webp" />
        <AvatarFallback>U2</AvatarFallback>
      </Avatar>
      <Avatar>
        <AvatarImage src="https://cdn.21st.dev/assets/localized/3e14564fe91df8e31fae8034557a1bc79cb8370a2f5a1fd87a06b0d226a46eaa.webp" />
        <AvatarFallback>U3</AvatarFallback>
      </Avatar>
    </div>
  );
}

function Demo() {
  return <FullScreenChatDeck currentUser={null} />;
}

export { ReverseOrder, AvatarStack, Demo };
export default ReverseOrder;
