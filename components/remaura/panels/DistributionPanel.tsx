"use client";

import { useLanguage } from "@/components/i18n/LanguageProvider";
import { PlatformBox } from "@/components/remaura/PlatformBox";
import { useRemauraApp } from "@/components/remaura/workspace/RemauraWorkspaceContexts";

export function DistributionPanel() {
  const { t } = useLanguage();
  const {
    instaTab,
    setInstaTab,
    tiktokTab,
    setTiktokTab,
    threadsTab,
    setThreadsTab,
    facebookTab,
    setFacebookTab,
    linkedinTab,
    setLinkedinTab,
    pinterestTab,
    setPinterestTab,
    xTab,
    setXTab,
    youtubeTab,
    setYoutubeTab,
    etsyTab,
    setEtsyTab,
    trendyolTab,
    setTrendyolTab,
    ciceksepetiTab,
    setCiceksepetiTab,
    amazonHandmadeTab,
    setAmazonHandmadeTab,
    shopierTab,
    setShopierTab,
    gumroadTab,
    setGumroadTab,
    adobeStockTab,
    setAdobeStockTab,
    shutterstockTab,
    setShutterstockTab,
    creativeMarketTab,
    setCreativeMarketTab,
    nextTab,
    setNextTab,
    expandedPlatforms,
    togglePlatform,
    handleCopy,
    copiedId,
    copyIconDefault,
    copyIconCopied,
    getContentForPlatform,
  } = useRemauraApp();

  return (
    <div className="w-full px-1 sm:px-2">
      <div className="mb-5 grid grid-cols-1 gap-5 border-b border-border pb-4 sm:mb-8 sm:gap-6 md:grid-cols-2">
        <h2 className="font-display text-lg font-light uppercase tracking-[0.3em] text-foreground sm:text-xl sm:tracking-[0.4em] dark:border-white/10">
          {t.remauraWorkspace.distributionChannels}
        </h2>
        <p className="hidden font-display text-lg font-light uppercase tracking-[0.2em] text-foreground sm:block md:flex md:items-end md:justify-start sm:text-xl sm:tracking-[0.3em]">
          {t.remauraWorkspace.channelColumnHeaders}
        </p>
      </div>

      <section className="mb-10">
        <div className="mb-4 border-b border-border/50 pb-3 dark:border-white/10">
          <h3 className="mb-1 text-sm font-bold uppercase tracking-wider text-foreground">
            {t.remauraWorkspace.group1Title}
          </h3>
          <p className="text-xs text-muted/80">{t.remauraWorkspace.group1Desc}</p>
        </div>
        <div className="grid grid-cols-1 gap-4 sm:gap-5 md:grid-cols-2 md:items-start">
          <PlatformBox
            name="Instagram"
            dotColor="bg-pink-500"
            activeClasses="bg-pink-500 text-white"
            tab={instaTab}
            setTab={setInstaTab}
            copyId="instagram"
            descBorder="border-l-2 border-pink-500/50"
            expanded={expandedPlatforms.has("instagram")}
            onToggle={() => togglePlatform("instagram")}
            handleCopy={handleCopy}
            copiedId={copiedId}
            copyIconDefault={copyIconDefault}
            copyIconCopied={copyIconCopied}
            contentToCopy={getContentForPlatform("instagram", instaTab)}
          />
          <PlatformBox
            name="TikTok"
            dotColor="bg-black dark:bg-white"
            activeClasses="bg-black text-white dark:bg-white dark:text-black"
            tab={tiktokTab}
            setTab={setTiktokTab}
            copyId="tiktok"
            descBorder="border-l-2 border-black/30 dark:border-white/30"
            expanded={expandedPlatforms.has("tiktok")}
            onToggle={() => togglePlatform("tiktok")}
            handleCopy={handleCopy}
            copiedId={copiedId}
            copyIconDefault={copyIconDefault}
            copyIconCopied={copyIconCopied}
            contentToCopy={getContentForPlatform("tiktok", tiktokTab)}
          />
          <PlatformBox
            name="Threads"
            dotColor="bg-[#5C5C5C]"
            activeClasses="bg-[#5C5C5C] text-white"
            tab={threadsTab}
            setTab={setThreadsTab}
            copyId="threads"
            descBorder="border-l-2 border-[#5C5C5C]/50"
            expanded={expandedPlatforms.has("threads")}
            onToggle={() => togglePlatform("threads")}
            handleCopy={handleCopy}
            copiedId={copiedId}
            copyIconDefault={copyIconDefault}
            copyIconCopied={copyIconCopied}
            contentToCopy={getContentForPlatform("threads", threadsTab)}
          />
          <PlatformBox
            name="Facebook"
            dotColor="bg-[#1877F2]"
            activeClasses="bg-[#1877F2] text-white"
            tab={facebookTab}
            setTab={setFacebookTab}
            copyId="facebook"
            expanded={expandedPlatforms.has("facebook")}
            onToggle={() => togglePlatform("facebook")}
            handleCopy={handleCopy}
            copiedId={copiedId}
            copyIconDefault={copyIconDefault}
            copyIconCopied={copyIconCopied}
            contentToCopy={getContentForPlatform("facebook", facebookTab)}
          />
        </div>
      </section>

      <section className="mb-10">
        <div className="mb-4 border-b border-border/50 pb-3 dark:border-white/10">
          <h3 className="mb-1 text-sm font-bold uppercase tracking-wider text-foreground">
            {t.remauraWorkspace.group2Title}
          </h3>
          <p className="text-xs text-muted/80">{t.remauraWorkspace.group2Desc}</p>
        </div>
        <div className="grid grid-cols-1 gap-4 sm:gap-5 md:grid-cols-2 md:items-start">
          <PlatformBox
            name="LinkedIn"
            dotColor="bg-[#0A66C2]"
            activeClasses="bg-[#0A66C2] text-white"
            tab={linkedinTab}
            setTab={setLinkedinTab}
            copyId="linkedin"
            descBorder="border-l-2 border-[#0A66C2]/50"
            expanded={expandedPlatforms.has("linkedin")}
            onToggle={() => togglePlatform("linkedin")}
            handleCopy={handleCopy}
            copiedId={copiedId}
            copyIconDefault={copyIconDefault}
            copyIconCopied={copyIconCopied}
            contentToCopy={getContentForPlatform("linkedin", linkedinTab)}
          />
          <PlatformBox
            name="Pinterest"
            dotColor="bg-[#E60023]"
            activeClasses="bg-[#E60023] text-white"
            tab={pinterestTab}
            setTab={setPinterestTab}
            copyId="pinterest"
            descBorder="border-l-2 border-[#E60023]/50"
            expanded={expandedPlatforms.has("pinterest")}
            onToggle={() => togglePlatform("pinterest")}
            handleCopy={handleCopy}
            copiedId={copiedId}
            copyIconDefault={copyIconDefault}
            copyIconCopied={copyIconCopied}
            contentToCopy={getContentForPlatform("pinterest", pinterestTab)}
          />
          <PlatformBox
            name="X"
            dotColor="bg-[#000000] dark:bg-white"
            activeClasses="bg-[#000000] text-white dark:bg-white dark:text-black"
            tab={xTab}
            setTab={setXTab}
            copyId="x"
            descBorder="border-l-2 border-black/30 dark:border-white/30"
            expanded={expandedPlatforms.has("x")}
            onToggle={() => togglePlatform("x")}
            handleCopy={handleCopy}
            copiedId={copiedId}
            copyIconDefault={copyIconDefault}
            copyIconCopied={copyIconCopied}
            contentToCopy={getContentForPlatform("x", xTab)}
          />
          <PlatformBox
            name="YouTube"
            dotColor="bg-[#FF0000]"
            activeClasses="bg-[#FF0000] text-white"
            tab={youtubeTab}
            setTab={setYoutubeTab}
            copyId="youtube"
            expanded={expandedPlatforms.has("youtube")}
            onToggle={() => togglePlatform("youtube")}
            handleCopy={handleCopy}
            copiedId={copiedId}
            copyIconDefault={copyIconDefault}
            copyIconCopied={copyIconCopied}
            contentToCopy={getContentForPlatform("youtube", youtubeTab)}
          />
        </div>
      </section>

      <section className="mb-10">
        <div className="mb-4 border-b border-border/50 pb-3 dark:border-white/10">
          <h3 className="mb-1 text-sm font-bold uppercase tracking-wider text-foreground">
            {t.remauraWorkspace.group3Title}
          </h3>
          <p className="text-xs text-muted/80">{t.remauraWorkspace.group3Desc}</p>
        </div>
        <div className="grid grid-cols-1 gap-4 sm:gap-5 md:grid-cols-2 md:items-start">
          <PlatformBox
            name="Trendyol"
            dotColor="bg-[#F27A1A]"
            activeClasses="bg-[#F27A1A] text-white"
            tab={trendyolTab}
            setTab={setTrendyolTab}
            copyId="trendyol"
            descBorder="border-l-2 border-[#F27A1A]/50"
            expanded={expandedPlatforms.has("trendyol")}
            onToggle={() => togglePlatform("trendyol")}
            handleCopy={handleCopy}
            copiedId={copiedId}
            copyIconDefault={copyIconDefault}
            copyIconCopied={copyIconCopied}
            contentToCopy={getContentForPlatform("trendyol", trendyolTab)}
          />
          <PlatformBox
            name="Çiçek Sepeti"
            dotColor="bg-[#00A650]"
            activeClasses="bg-[#00A650] text-white"
            tab={ciceksepetiTab}
            setTab={setCiceksepetiTab}
            copyId="ciceksepeti"
            descBorder="border-l-2 border-[#00A650]/50"
            expanded={expandedPlatforms.has("ciceksepeti")}
            onToggle={() => togglePlatform("ciceksepeti")}
            handleCopy={handleCopy}
            copiedId={copiedId}
            copyIconDefault={copyIconDefault}
            copyIconCopied={copyIconCopied}
            contentToCopy={getContentForPlatform("ciceksepeti", ciceksepetiTab)}
          />
          <PlatformBox
            name="Etsy"
            dotColor="bg-[#F1641E]"
            activeClasses="bg-[#F1641E] text-white"
            tab={etsyTab}
            setTab={setEtsyTab}
            copyId="etsy"
            descBorder="border-l-2 border-[#F1641E]/50"
            expanded={expandedPlatforms.has("etsy")}
            onToggle={() => togglePlatform("etsy")}
            handleCopy={handleCopy}
            copiedId={copiedId}
            copyIconDefault={copyIconDefault}
            copyIconCopied={copyIconCopied}
            contentToCopy={getContentForPlatform("etsy", etsyTab)}
          />
          <PlatformBox
            name="Amazon Handmade"
            dotColor="bg-[#FF9900]"
            activeClasses="bg-[#FF9900] text-white"
            tab={amazonHandmadeTab}
            setTab={setAmazonHandmadeTab}
            copyId="amazon"
            expanded={expandedPlatforms.has("amazon")}
            onToggle={() => togglePlatform("amazon")}
            handleCopy={handleCopy}
            copiedId={copiedId}
            copyIconDefault={copyIconDefault}
            copyIconCopied={copyIconCopied}
            contentToCopy={getContentForPlatform("amazon", amazonHandmadeTab)}
          />
          <PlatformBox
            name="Shopier / Shopify"
            dotColor="bg-[#96BF48]"
            activeClasses="bg-[#96BF48] text-white"
            tab={shopierTab}
            setTab={setShopierTab}
            copyId="shopier"
            descBorder="border-l-2 border-[#96BF48]/50"
            expanded={expandedPlatforms.has("shopier")}
            onToggle={() => togglePlatform("shopier")}
            handleCopy={handleCopy}
            copiedId={copiedId}
            copyIconDefault={copyIconDefault}
            copyIconCopied={copyIconCopied}
            contentToCopy={getContentForPlatform("shopier", shopierTab)}
          />
          <PlatformBox
            name="Gumroad"
            dotColor="bg-[#36A9AE]"
            activeClasses="bg-[#36A9AE] text-white"
            tab={gumroadTab}
            setTab={setGumroadTab}
            copyId="gumroad"
            descBorder="border-l-2 border-[#36A9AE]/50"
            expanded={expandedPlatforms.has("gumroad")}
            onToggle={() => togglePlatform("gumroad")}
            handleCopy={handleCopy}
            copiedId={copiedId}
            copyIconDefault={copyIconDefault}
            copyIconCopied={copyIconCopied}
            contentToCopy={getContentForPlatform("gumroad", gumroadTab)}
          />
        </div>
      </section>

      <section>
        <div className="mb-4 border-b border-border/50 pb-3 dark:border-white/10">
          <h3 className="mb-1 text-sm font-bold uppercase tracking-wider text-foreground">
            {t.remauraWorkspace.group4Title}
          </h3>
          <p className="text-xs text-muted/80">{t.remauraWorkspace.group4Desc}</p>
        </div>
        <div className="grid grid-cols-1 gap-4 sm:gap-5 md:grid-cols-2 md:items-start">
          <PlatformBox
            name="Adobe Stock"
            dotColor="bg-[#FF0000]"
            activeClasses="bg-[#FF0000] text-white"
            tab={adobeStockTab}
            setTab={setAdobeStockTab}
            copyId="adobeStock"
            descBorder="border-l-2 border-[#FF0000]/50"
            expanded={expandedPlatforms.has("adobeStock")}
            onToggle={() => togglePlatform("adobeStock")}
            handleCopy={handleCopy}
            copiedId={copiedId}
            copyIconDefault={copyIconDefault}
            copyIconCopied={copyIconCopied}
            contentToCopy={getContentForPlatform("adobeStock", adobeStockTab)}
          />
          <PlatformBox
            name="Shutterstock"
            dotColor="bg-[#EE2B24]"
            activeClasses="bg-[#EE2B24] text-white"
            tab={shutterstockTab}
            setTab={setShutterstockTab}
            copyId="shutterstock"
            descBorder="border-l-2 border-[#EE2B24]/50"
            expanded={expandedPlatforms.has("shutterstock")}
            onToggle={() => togglePlatform("shutterstock")}
            handleCopy={handleCopy}
            copiedId={copiedId}
            copyIconDefault={copyIconDefault}
            copyIconCopied={copyIconCopied}
            contentToCopy={getContentForPlatform("shutterstock", shutterstockTab)}
          />
          <PlatformBox
            name="Creative Market"
            dotColor="bg-[#27A776]"
            activeClasses="bg-[#27A776] text-white"
            tab={creativeMarketTab}
            setTab={setCreativeMarketTab}
            copyId="creativeMarket"
            descBorder="border-l-2 border-[#27A776]/50"
            expanded={expandedPlatforms.has("creativeMarket")}
            onToggle={() => togglePlatform("creativeMarket")}
            handleCopy={handleCopy}
            copiedId={copiedId}
            copyIconDefault={copyIconDefault}
            copyIconCopied={copyIconCopied}
            contentToCopy={getContentForPlatform("creativeMarket", creativeMarketTab)}
          />
          <PlatformBox
            name="NEXT"
            dotColor="bg-[#00D1B2]"
            activeClasses="bg-[#00D1B2] text-white"
            tab={nextTab}
            setTab={setNextTab}
            copyId="next"
            descBorder="border-l-2 border-[#00D1B2]/50"
            expanded={expandedPlatforms.has("next")}
            onToggle={() => togglePlatform("next")}
            handleCopy={handleCopy}
            copiedId={copiedId}
            copyIconDefault={copyIconDefault}
            copyIconCopied={copyIconCopied}
            contentToCopy={getContentForPlatform("next", nextTab)}
          />
        </div>
      </section>
    </div>
  );
}
