import { isBlank } from "@ember/utils";
import {
  attributeBindings,
  classNameBindings,
  classNames,
} from "@ember-decorators/component";
import discourseComputed from "discourse/lib/decorators";
import AdComponent from "discourse/plugins/discourse-adplugin/discourse/components/ad-component";

const adIndex = {
  topic_list_top: null,
  topic_above_post_stream: null,
  topic_above_suggested: null,
  post_bottom: null,
  topic_list_between: null,
};

@classNames("house-creative")
@classNameBindings("adUnitClass")
@attributeBindings("colspanAttribute:colspan")
export default class HouseAd extends AdComponent {
  adHtml = "";

  @discourseComputed
  colspanAttribute() {
    return this.tagName === "td" ? "5" : null;
  }

  @discourseComputed("placement", "showAd")
  adUnitClass(placement, showAd) {
    return showAd ? `house-${placement}` : "";
  }

  @discourseComputed(
    "showToGroups",
    "showAfterPost",
    "showAfterTopicListItem",
    "showOnCurrentPage"
  )
  showAd(
    showToGroups,
    showAfterPost,
    showAfterTopicListItem,
    showOnCurrentPage
  ) {
    return (
      showToGroups &&
      (showAfterPost || showAfterTopicListItem) &&
      showOnCurrentPage
    );
  }

  @discourseComputed("postNumber", "placement")
  showAfterPost(postNumber, placement) {
    if (!postNumber && placement !== "topic-list-between") {
      return true;
    }

    return this.isNthPost(
      parseInt(this.site.get("house_creatives.settings.after_nth_post"), 10)
    );
  }

  @discourseComputed("placement")
  showAfterTopicListItem(placement) {
    if (placement !== "topic-list-between") {
      return true;
    }

    return this.isNthTopicListItem(
      parseInt(this.site.get("house_creatives.settings.after_nth_topic"), 10)
    );
  }

  chooseAdHtml() {
    const houseAds = this.site.get("house_creatives"),
      placement = this.get("placement"),
      placementUnderscored = placement.replace(/-/g, "_");

    // 如果是topic-list-top位置，合併顯示所有廣告
    if (placement === "topic-list-top" && houseAds.settings[placementUnderscored]) {
      const adNames = houseAds.settings[placementUnderscored].split("|");
      const validAds = adNames.filter(adName => {
        const ad = houseAds.creatives[adName];
        return ad && (!ad.category_ids?.length || 
          ad.category_ids.includes(this.currentCategoryId));
      });

      if (validAds.length > 0) {
        // 合併所有廣告HTML
        return validAds.map(adName => houseAds.creatives[adName].html).join("");
      }
    } else {
      // 其他位置保持原來的邏輯
      const ad = houseAds.creatives[placement];
      if (
        ad &&
        (!ad.category_ids?.length ||
          ad.category_ids.includes(this.currentCategoryId))
      ) {
        return ad.html;
      }
    }
  }

  adsNamesForSlot(placement) {
    const houseAds = this.site.get("house_creatives");

    if (!houseAds || !houseAds.settings) {
      return [];
    }

    const adsForSlot = houseAds.settings[placement];

    if (Object.keys(houseAds.creatives).length > 0 && !isBlank(adsForSlot)) {
      return adsForSlot.split("|");
    } else {
      return [];
    }
  }

  refreshAd() {
    this.set("adHtml", this.chooseAdHtml());
  }

  didInsertElement() {
    super.didInsertElement(...arguments);

    if (!this.get("showAd")) {
      return;
    }

    if (adIndex.topic_list_top === null) {
      // start at a random spot in the ad inventory
      const houseAds = this.site.get("house_creatives");
      Object.keys(adIndex).forEach((placement) => {
        const adNames = this.adsNamesForSlot(placement);
        if (adNames.length === 0) {
          return;
        }
        // filter out ads that should not be shown on the current page
        const filteredAds = adNames.filter((adName) => {
          const ad = houseAds.creatives[adName];
          return (
            ad &&
            (!ad.category_ids?.length ||
              ad.category_ids.includes(this.currentCategoryId))
          );
        });
        adIndex[placement] = Math.floor(Math.random() * filteredAds.length);
      });
    }

    this.refreshAd();
  }
}
