import { X } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Slider } from "@/components/ui/slider";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useState, useEffect } from "react";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import type { MlModelConfig } from "@shared/schema";

interface ConfigurationModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export default function ConfigurationModal({ open, onOpenChange }: ConfigurationModalProps) {
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const [threshold, setThreshold] = useState([75]);
  const [updateFrequency, setUpdateFrequency] = useState("real-time");
  const [dataRetention, setDataRetention] = useState("7days");

  const { data: config } = useQuery<MlModelConfig>({
    queryKey: ["/api/model/config"],
    enabled: open,
  });

  useEffect(() => {
    if (config) {
      setThreshold([config.detectionThreshold * 100]);
      setUpdateFrequency(config.updateFrequency);
      setDataRetention(config.dataRetentionPeriod);
    }
  }, [config]);

  const updateConfigMutation = useMutation({
    mutationFn: async (data: Partial<MlModelConfig>) => {
      const response = await apiRequest("PATCH", "/api/model/config", data);
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/model/config"] });
      toast({
        title: "Configuration Updated",
        description: "ML model configuration has been successfully updated.",
      });
      onOpenChange(false);
    },
    onError: () => {
      toast({
        title: "Update Failed",
        description: "Failed to update configuration. Please try again.",
        variant: "destructive",
      });
    },
  });

  const handleSave = () => {
    updateConfigMutation.mutate({
      detectionThreshold: threshold[0] / 100,
      updateFrequency,
      dataRetentionPeriod: dataRetention,
    });
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto" data-testid="config-modal">
        <DialogHeader>
          <DialogTitle className="flex items-center justify-between">
            Model Configuration
            <Button
              size="icon"
              variant="ghost"
              onClick={() => onOpenChange(false)}
              data-testid="button-close-config"
            >
              <X className="h-4 w-4" />
            </Button>
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-6 py-4">
          <div className="space-y-4">
            <div>
              <Label className="text-sm font-medium text-foreground mb-2 block">
                Detection Threshold
              </Label>
              <Slider
                value={threshold}
                onValueChange={setThreshold}
                max={100}
                min={0}
                step={1}
                className="w-full"
                data-testid="slider-threshold"
              />
              <div className="flex justify-between text-xs text-muted-foreground mt-1">
                <span>Low Sensitivity</span>
                <span className="font-medium">{threshold[0]}%</span>
                <span>High Sensitivity</span>
              </div>
            </div>

            <div>
              <Label className="text-sm font-medium text-foreground mb-2 block">
                Model Update Frequency
              </Label>
              <Select value={updateFrequency} onValueChange={setUpdateFrequency}>
                <SelectTrigger data-testid="select-update-frequency">
                  <SelectValue placeholder="Select frequency" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="real-time">Real-time</SelectItem>
                  <SelectItem value="5minutes">Every 5 minutes</SelectItem>
                  <SelectItem value="15minutes">Every 15 minutes</SelectItem>
                  <SelectItem value="hourly">Hourly</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label className="text-sm font-medium text-foreground mb-2 block">
                Data Retention Period
              </Label>
              <Select value={dataRetention} onValueChange={setDataRetention}>
                <SelectTrigger data-testid="select-data-retention">
                  <SelectValue placeholder="Select retention period" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="7days">7 days</SelectItem>
                  <SelectItem value="30days">30 days</SelectItem>
                  <SelectItem value="90days">90 days</SelectItem>
                  <SelectItem value="1year">1 year</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="flex justify-end space-x-3 pt-4 border-t border-border">
            <Button 
              variant="secondary" 
              onClick={() => onOpenChange(false)}
              data-testid="button-cancel-config"
            >
              Cancel
            </Button>
            <Button 
              onClick={handleSave}
              disabled={updateConfigMutation.isPending}
              data-testid="button-save-config"
            >
              {updateConfigMutation.isPending ? "Saving..." : "Save Configuration"}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
